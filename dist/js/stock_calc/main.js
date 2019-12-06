
function formatNumber(n) {
    // format number 1000000 to 1,234,567
    return n.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
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

function vv(event) {
    
    var formObject = formData($(this).serializeArray());

    if(isNaN(formObject.buy)) {
        $('[name="buy"]').trigger('focus').closest('.form-group').addClass('has-error');
        return false;
    }
}

function calc (event) {
    
    var formObject = formData($(this).serializeArray());

    if(isNaN(formObject.number))
        $('[name="number"]').val(1);

    if(isNaN(formObject.fee))
        $('[name="fee"]').val(0.1425);

    if(isNaN(formObject.discount))
        $('[name="discount"]').val(0);

    if(isNaN(formObject.tax))
        $('[name="tax"]').val(0.3);

    if(isNaN(formObject.buy)) {
        return false;
    }

    $('[name="base"]').removeAttr('disabled');

    var fixed = 1, minFee = 20, base = 1.0;
    if(formObject.buy < 10) {
        base = 0.01;
        fixed = 2;
    }
    else if(formObject.buy < 50) {
        base = 0.05;
        fixed = 2;
    }
    else if(formObject.buy < 100) {
        base = 0.1;
    }
    else if(formObject.buy < 500) {
        base = 0.5;
    }
    $('[name="base"]').val(base);

    if(isNaN(formObject.start))
        $('[name="start"]').val(formObject.buy);

    if(isNaN(formObject.end))
        $('[name="end"]').val(formObject.buy + 10);

    formObject = formData($(this).serializeArray());

    formObject.number = formObject.number * 1000;

    var calcObject = {
        holdingBuy: formObject.buy * formObject.number,
        holdingFee: 0,
        holdingCost: 0,
        sell: []
    };

    calcObject.holdingFee = Math.ceil(calcObject.holdingBuy * (formObject.fee / 100));
    if(!isNaN(formObject.discount) && formObject.discount > 0)
        calcObject.holdingFee = Math.ceil(calcObject.holdingBuy * (formObject.fee / 100) * (formObject.discount / 100), 3);
    if(calcObject.holdingFee < minFee)
        calcObject.holdingFee = minFee;
    calcObject.holdingCost = calcObject.holdingBuy + calcObject.holdingFee;

    var price = formObject.start;
    do {
        var row = {
            price: price.toFixed(fixed),
            fee: Math.ceil(price * formObject.number * formObject.fee / 100),
            tax: Math.ceil(price * formObject.number * formObject.tax / 100),
            value: Math.ceil(price * formObject.number)
        };
        if(!isNaN(formObject.discount) && formObject.discount > 0)
        row.fee = Math.ceil(price * formObject.number * (formObject.fee / 100) * (formObject.discount / 100));
        if(row.fee < 20)
            row.fee = minFee;
        row.rawCost = calcObject.holdingFee + row.tax + row.fee;
        row.profit = row.value - calcObject.holdingCost - row.tax - row.fee;
        row.pp = row.profit / (formObject.buy * formObject.number) * 100;
        row.pp = row.pp.toFixed(3);
        row.textClass = (row.profit > 0) ? "red" : "green";
        calcObject.sell.push(row);
        price = price + formObject.base;
        price = parseFloat(price.toFixed(fixed), 10);
    } while(price <= formObject.end.toFixed(fixed));

    formObject = _.extend(formObject, calcObject);
    
    var template = '<div class="no-padding"> <div data-spy="affix" data-offset-top="440"> <div class="text-center"> <a href="stock_calc.html" class="text-danger">[&nbsp;<i class="fa fa-refresh"></i>&nbsp;重新計算&nbsp;]</a> </div> <table class="table"> <thead> <tr> <th>持有成本</th> <th> <span class="money">{{holdingCost}}</span>&nbsp; <small class="text-muted">( {{holdingBuy}} + {{holdingFee}} )</small> </th> </tr> <tr> <th>買入手續費</th> <th> <span class="money">{{holdingFee}}</span> {{#dangchong}}<div class="pull-right text-aqua"><i class="fa fa-check"></i>&nbsp;當沖</div>{{/dangchong}}</th> </tr> </thead> </table> </div> <table class="table table-striped"> <thead> <tr> <th class="text-center">賣出股價</th> <th>損益</th> <th>明細</th> </tr> </thead> <tbody> {{#sell}} <tr> <td class="text-center text-{{textClass}}">{{price}}</td> <td> <strong class="money text-{{textClass}}">{{profit}}</strong><br> <small> <span class="text-muted">報酬率：</span> <span class="text-{{textClass}}">{{pp}}%</span> </small> </td> <td> <span>收入：</span> <small class="money">{{value}}</small><br> <span>賣出手續費：</span> <small class="money">{{fee}}</small><br> <span>交易稅：</span> <small class="money">{{tax}}</small><br> <span>成本：</span> <small class="money">{{rawCost}}</small> </td> </tr> {{/sell}} </tbody> </table></div>';
    Mustache.parse(template);
    var rendered = Mustache.render(template, formObject);
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
}

    $('input').each(function() {
        var paramValue = getParam(this.name);
        if(this.value == "" && paramValue != "") this.value = paramValue;
    });

    $('input[type="checkbox"]').each(function() {
        var paramValue = getParam(this.name);
        if(paramValue === "1")
            this.checked = true;
    });

    calc.call($('form').get(0));

    $('input[type="text"]')
        .on('click', function (event) { $(this).select(); });
    $('[name="buy"]').trigger('click');

    $('form').on('submit', vv);
    $('input[name="dangchong"]').on('change', function () {
        $('[name="tax"]').val($(this).is(':checked') ? 0.15 : 0.3);
        $('[name="tax"]').trigger('change');
    });

    $('#share').on('click', function (event) {
        if (navigator.share) {
            navigator.share({
                title: document.title,
                text: '買入的股票您需要股價要多少才能獲利?',
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
            alert('複製成功!');
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