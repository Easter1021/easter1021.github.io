
function formatNumber(n) {
    // format number 1000000 to 1,234,567
    return n.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function fillParamToInputs() {
    $('input').each(function() {
        var paramValue = getParam(this.name);
        switch(this.type)  {
            case "checkbox":
                this.checked = false;
                if(paramValue === "1")
                    this.checked = true;
                break;
            case "text":
                if(paramValue != "") 
                    this.value = paramValue;
                break;
        }
    });
}

function getParam(name) { 
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]"); 
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), 
        results = regex.exec(location.search); 
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " ")); 
}


function formData(serializeArray) {
    return _.reduce(serializeArray, function (obj, item) {
        obj[item.name] = parseFloat(item.value, 10);
        return obj;
    }, {});
}

function calc (event) {
    
    var form = formData($(this).serializeArray());

    if(isNaN(form.number))
        $('[name="number"]', this).val(1);

    if(isNaN(form.fee))
        $('[name="fee"]', this).val(0.1425);

    if(isNaN(form.discount))
        $('[name="discount"]', this).val(0);

    if(isNaN(form.tax))
        $('[name="tax"]', this).val(0.3);

    if(isNaN(form.buy)) {
        $('[name="buy"]', this).trigger('focus').closest('.form-group').addClass('has-error');
        $('.info').removeClass('hidden');
        return false;
    }
    $('[name="buy"]', this).closest('.form-group').removeClass('has-error');
    $('.overlay').removeClass('hidden');

    $('[name="base"]', this).removeAttr('disabled');

    var fixed = 1, minFee = 20, base = 1.0;
    if(form.buy < 10) {
        base = 0.01;
        fixed = 2;
    }
    else if(form.buy < 50) {
        base = 0.05;
        fixed = 2;
    }
    else if(form.buy < 100) {
        base = 0.1;
    }
    else if(form.buy < 500) {
        base = 0.5;
    }
    $('[name="base"]', this).val(base);

    if(isNaN(form.start))
        $('[name="start"]', this).val(form.buy);

    if(isNaN(form.end))
        $('[name="end"]', this).val(form.buy + 10);

    form = formData($(this).serializeArray());

    form.number = form.number * 1000;

    var calcData = {
        holdingBuy: form.buy * form.number,
        holdingFee: 0,
        holdingCost: 0,
        sell: []
    };

    calcData.holdingFee = Math.ceil(calcData.holdingBuy * (form.fee / 100));
    if(!isNaN(form.discount) && form.discount > 0)
        calcData.holdingFee = Math.ceil(calcData.holdingBuy * (form.fee / 100) * (form.discount / 100), 3);
    if(calcData.holdingFee < minFee)
        calcData.holdingFee = minFee;
    calcData.holdingCost = calcData.holdingBuy + calcData.holdingFee;

    var price = form.start;
    do {
        var row = {
            price: price.toFixed(fixed),
            fee: Math.ceil(price * form.number * form.fee / 100),
            tax: Math.ceil(price * form.number * form.tax / 100),
            value: Math.ceil(price * form.number)
        };
        if(!isNaN(form.discount) && form.discount > 0)
        row.fee = Math.ceil(price * form.number * (form.fee / 100) * (form.discount / 100));
        if(row.fee < 20)
            row.fee = minFee;
        row.rawCost = calcData.holdingFee + row.tax + row.fee;
        row.profit = row.value - calcData.holdingCost - row.tax - row.fee;
        row.pp = row.profit / (form.buy * form.number) * 100;
        row.pp = row.pp.toFixed(3);
        row.textClass = (row.profit > 0) ? "red" : "green";
        calcData.sell.push(row);
        price = price + form.base;
        price = parseFloat(price.toFixed(fixed), 10);
    } while(price <= form.end.toFixed(fixed));

    form = _.extend(form, calcData);
    
    var template = '<div class="no-padding"> <div data-spy="affix" data-offset-top="440"> <div class="text-center"> <a href="stock_calc.html" class="text-danger">[&nbsp;<i class="fa fa-refresh"></i>&nbsp;重新計算&nbsp;]</a> </div> <table class="table"> <thead> <tr> <th>持有成本</th> <th> <span class="money">{{holdingCost}}</span>&nbsp; <small class="text-muted">( {{holdingBuy}} + {{holdingFee}} )</small> </th> </tr> <tr> <th>買入手續費</th> <th> <span class="money">{{holdingFee}}</span> {{#dangchong}}<div class="pull-right text-aqua"><i class="fa fa-check"></i>&nbsp;當沖</div>{{/dangchong}}</th> </tr> </thead> </table> </div> <table class="table table-striped"> <thead> <tr> <th class="text-center">賣出股價</th> <th>損益</th> <th>明細</th> </tr> </thead> <tbody> {{#sell}} <tr> <td class="text-center text-{{textClass}}">{{price}}</td> <td> <strong class="money text-{{textClass}}">{{profit}}</strong><br> <small> <span class="text-muted">報酬率：</span> <span class="text-{{textClass}}">{{pp}}%</span> </small> </td> <td> <span>收入：</span> <small class="money">{{value}}</small><br> <span>賣出手續費：</span> <small class="money">{{fee}}</small><br> <span>交易稅：</span> <small class="money">{{tax}}</small><br> <span>成本：</span> <small class="money">{{rawCost}}</small> </td> </tr> {{/sell}} </tbody> </table></div>';
    Mustache.parse(template);
    var rendered = Mustache.render(template, form);
    $('#target').html(rendered);
    $('[data-spy="affix"]').affix({
        offset: {
            top: 400
        }
    })

    $('.money').map(function () {
        $(this).text(formatNumber($(this).text()));
    });

    $('[name="base"]').attr('disabled', 'disabled');
    $('.info').addClass('hidden');

    var form = formData($(this).serializeArray());
    form.pageTitle = "買入 $" + form.buy + " 的股票需要漲多少才能獲利?";
    history.pushState(form, form.pageTitle, "?" + $(this).serialize())

    setTimeout(() => {
        $('.overlay').addClass('hidden');
    }, 1000 * 0.4);

    document.title = form.pageTitle;

    return false;
}

fillParamToInputs();
calc.call($('form').get(0));

$('form').on('submit', calc);
$('input[type="text"]')
    .on('change', function (event) { $('form').trigger('submit'); })
    .on('click', function (event) { $(this).select(); });
$('[name="buy"]').trigger('click');
$('input[name="dangchong"]').on('change', function () {
    $('[name="tax"]').val($(this).is(':checked') ? 0.15 : 0.3);
    $('[name="tax"]').trigger('change');
});

$('#share').on('click', function (event) {
    event.preventDefault();
    if (navigator.share) {
        navigator.share({
            title: "一目了然的股票現貨買入獲利計算機",
            text: document.title,
            url: window.location.href,
            })
            .then(() => {console.log('Successful share')})
            .catch((error) => console.log('Error sharing', error));
    } 
    else {
        console.log('Share not supported on this browser.');
        const el = document.createElement('textarea');
        el.value = window.location.href;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        $('#modal-copy-success').modal('show');
    }
});

commentBox('5765278868701184-proj');

$(window).scroll(function () {
    if ($(this).scrollTop() > 100) {
      $('.scroll-top').fadeIn();
    } else {
      $('.scroll-top').fadeOut();
    }
});

window.onpopstate = function(event){
    if(event.state) {
        document.title = event.state.pageTitle;
        fillParamToInputs();
        calc.call($('form').get(0));
    }
};