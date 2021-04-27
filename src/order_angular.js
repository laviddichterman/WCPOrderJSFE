var TOPPING_NONE = WCPShared.TOPPING_NONE;
var TOPPING_LEFT = WCPShared.TOPPING_LEFT;
var TOPPING_RIGHT = WCPShared.TOPPING_RIGHT;
var TOPPING_WHOLE = WCPShared.TOPPING_WHOLE;
var EMAIL_REGEX = WCPShared.EMAIL_REGEX;
var CREDIT_REGEX = WCPShared.CREDIT_REGEX;

var GetPlacementFromMIDOID = WCPShared.GetPlacementFromMIDOID;
var DisableDataCheck = WCPShared.DisableDataCheck;
var DATE_STRING_INTERNAL_FORMAT = WCPShared.WDateUtils.DATE_STRING_INTERNAL_FORMAT;

var CopyWCPProduct = WCPShared.CopyWCPProduct;
var WFunctional = WCPShared.WFunctional;

// handy class representing a line in the product cart
// useful to allow modifications on the product by setting it to a new product instance
// instead of modifying the product instance itself
var CartEntry = function (catid, product, quantity, can_edit) {
  this.catid = catid;
  this.pi = product;
  this.quantity = quantity;
  this.can_edit = can_edit;
  this.locked = false;
};

var $j = jQuery.noConflict();

var DELIVERY_INTERVAL_TIME = 30;

if (Number.EPSILON === undefined) {
  Number.EPSILON = Math.pow(2, -52);
}

var RoundToTwoDecimalPlaces = function(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
var SanitizeIfExists = function (str) {
  return str && str.length ? str.replace("'", "`").replace("/", "|").replace("&", "and").replace("<", "").replace(">", "").replace(/[\+\t\r\n\v\f]/g, '') : str;
}

var ProductHasSelectableModifiers = function(pi) {
  return pi.PRODUCT_CLASS.modifiers2.filter(function(x) { return true; /* TODO: filter out disabled modifiers */ }).length > 0;
}

function ScrollToEIdJQ(id, delay) { 
  setTimeout(function() {
    $j("html, body").animate({
      scrollTop: $j(id).offset().top - 150
    }, 500);
  }, delay);
}

function ScrollTopJQ() {
  ScrollToEIdJQ("#ordertop", 0);
}


var TimingInfo = function () {
  this.load_time = WCP_BLOG_LOAD_TIME;
  this.current_time = WCP_BLOG_LOAD_TIME;
  this.browser_load_time = moment();
  this.load_time_diff = 0;
};

var timing_info = new TimingInfo();

var WCPStoreConfig = function () {
  // WCP store settings
  // 0 == carry out/pickup
  // 1 == dine in
  // 2 == delivery
  this.PICKUP = 0;
  this.DINEIN = 1;
  this.DELIVERY = 2;

  this.SERVICE_TYPES = [
    ["Pickup", this.PICKUP],
    ["Dine-In", this.DINEIN],
    ["Delivery", this.DELIVERY],
  ];

  // option placement enums
  this.NONE = TOPPING_NONE;
  this.LEFT = TOPPING_LEFT;
  this.RIGHT = TOPPING_RIGHT;
  this.WHOLE = TOPPING_WHOLE;

  this.BLOCKED_OFF = [[], [], []];

  this.PICKUP_HOURS = [
    [12 * 60, 21 * 60], //sunday
    [1 * 60, 0 * 60], //monday
    [1 * 60, 0 * 60], //tuesday
    [16 * 60, 21 * 60], //wednesday
    [16 * 60, 21 * 60], //thursday
    [12 * 60, 22 * 60], //friday
    [12 * 60, 22 * 60] //saturday
  ];

  this.DINEIN_HOURS = [
    [1 * 60, 0 * 60], //sunday
    [1 * 60, 0 * 60], //monday
    [1 * 60, 0 * 60], //tuesday
    [1 * 60, 0 * 60], //wednesday
    [1 * 60, 0 * 60], //thursday
    [1 * 60, 0 * 60], //friday
    [1 * 60, 0 * 60] //saturday
  ];

  this.DELIVERY_HOURS = [
    [12 * 60, 21 * 60], //sunday
    [1 * 60, 0 * 60], //monday
    [1 * 60, 0 * 60], //tuesday
    [16 * 60, 21 * 60], //wednesday
    [16 * 60, 21 * 60], //thursday
    [12 * 60, 22 * 60], //friday
    [12 * 60, 22 * 60] //saturday
  ];

  this.HOURS_BY_SERVICE_TYPE = [
    this.PICKUP_HOURS,
    this.DINEIN_HOURS,
    this.DELIVERY_HOURS
  ];

  this.TAX_RATE = TAX_RATE;

  this.LEAD_TIME = [45, 45, 1440];

  this.ADDITIONAL_PIE_LEAD_TIME = 5;

  this.TIME_STEP = 15;

  // menu related
  this.MENU = {
    // modifiers are { MID: { modifier_type: WARIO modifier type JSON, options_list: [WCPOption], options: {OID: WCPOption} } }
    modifiers: {},
    // product_classes are { PID: { product: WARIO product class, instances_list: [WCPProduct], instances: {PIID: WCPProduct} } }
    product_classes: {},
    // categories are {CID: { menu: [WCPProducts], children: [CID], menu_name: HTML, subtitle: HTML } }
    categories: {},
    version: "NONE"
  };

  this.PIZZAS_CATID = PIZZAS_CATID;
  this.EXTRAS_CATID = EXTRAS_CATID;

  this.ALLOW_SLICING = CONFIG_ALLOW_SLICING;
  // END menu related

  // user messaging
  this.ENABLE_DINE_IN_PREPAYMENT = ENABLE_DINE_IN_PREPAYMENT;
  this.DINE_IN_TERMS_LIST = DINE_IN_TERMS_LIST;
  this.MAX_PARTY_SIZE = MAX_PARTY_SIZE;
  this.REQUEST_ANY = "By adding any special instructions, you will only be able to pay in person.";
  this.REQUEST_HALF = CONST_MESSAGE_REQUEST_HALF;
  this.REQUEST_SLICING = CONST_MESSAGE_REQUEST_SLICING;
  this.REQUEST_VEGAN = CONST_MESSAGE_REQUEST_VEGAN;
  this.REQUEST_SOONER = "It looks like you're trying to ask us to make your pizza sooner. While we would love to do so, the times you were able to select represents our real-time availability. Please send us a text if you're looking for your pizza earlier and it's not a Friday, Saturday, or Sunday, otherwise, you'll need to remove this request to continue with your order.";
  // END user messaging
  this.TIP_PREAMBLE = CONST_MESSAGE_TIP_PREAMBLE;
  this.DELIVERY_LINK = DELIVERY_LINK;

  this.UpdateBlockedOffVal = function (bo) {
    this.BLOCKED_OFF = bo;
  }

  this.UpdateLeadTimeVal = function (lt) {
    this.LEAD_TIME = lt;
  }

  this.UpdateOperatingHoursSettings = function (wario_settings) {
    this.ADDITIONAL_PIE_LEAD_TIME = wario_settings.additional_pizza_lead_time;
    this.TIME_STEP = wario_settings.time_step;
    for (var service_index = 0; service_index < wario_settings.operating_hours.length; ++service_index) {
      for (var day_index = 0; day_index < wario_settings.operating_hours[service_index].length; ++day_index) {
        // TODO: add support for multiple day parts
        this.HOURS_BY_SERVICE_TYPE[service_index][day_index] = wario_settings.operating_hours[service_index][day_index][0] ? wario_settings.operating_hours[service_index][day_index][0] : [60, 0];
      }
    }
  }

  this.UpdateCatalog = function (cat) {
    console.log(cat);
    if (cat.version === this.MENU.version) {
      return;
    }
    var catalog_map = new WCPShared.WMenu(cat);
    Object.assign(this.MENU, catalog_map);
  }
  //END WCP store config
};

var wcpconfig = new WCPStoreConfig();

var WCPOrderHelper = function () {
  // HELPER FUNCTIONS
  this.cfg = wcpconfig;

  this.IsFirstDatePreviousDayToSecond = function (first, second) {
    //takes moments
    return first.isBefore(second, 'day');
  };

  this.IsPreviousDay = function (date) {
    // dateis a moment
    return this.IsFirstDatePreviousDayToSecond(date, timing_info.current_time);
  };

  this.DateToMinutes = function (date) {
    // passed date is a moment
    return date.hours() * 60 + date.minutes();
  };

  this.MinutesToPrintTime = function (minutes, service_type) {
    var mtpt = function (min) {
      var hour = Math.floor(min / 60);
      var minute = min - (hour * 60);
      var meridian = hour >= 12 ? "PM" : "AM";
      var printHour = (hour % 12 === 0 ? 12 : hour % 12).toString();
      var printMinute = (minute < 10 ? "0" : "").concat(minute.toString());
      return printHour.concat(":").concat(printMinute + meridian);
    }
    if (isNaN(minutes) || minutes < 0) {
      return minutes;
    }
    var starttime = mtpt(minutes);
    return service_type != wcpconfig.DELIVERY ? starttime : starttime + " - " + mtpt(minutes + DELIVERY_INTERVAL_TIME);
  };

  this.GetBlockedOffForDate = function (date, service) {
    // date is passed as DATE_STRING_INTERNAL_FORMAT
    for (var i in this.cfg.BLOCKED_OFF[service]) {
      if (this.cfg.BLOCKED_OFF[service][i][0] === date) {
        return this.cfg.BLOCKED_OFF[service][i][1];
      }
    }
    return [];
  };

  this.HandleBlockedOffTime = function (blockedOff, time) {
    // param: blockedOff - the blocked off times for the date/service being processed
    // param: time - the minutes since the day started
    // return: time if time isn't blocked off, otherwise the next available time
    var pushedTime = time;
    for (var i in blockedOff) {
      if (blockedOff[i][1] >= pushedTime && blockedOff[i][0] <= pushedTime) {
        pushedTime = blockedOff[i][1] + this.cfg.TIME_STEP;
      }
    }
    return pushedTime;
  };

  this.GetServiceIntervalsForDate = function (date, service) {
    // date is passed as moment
    const internal_formatted_date = date.format(DATE_STRING_INTERNAL_FORMAT);
    var blocked_off = this.GetBlockedOffForDate(internal_formatted_date, service);
    var minmax = this.cfg.HOURS_BY_SERVICE_TYPE[service][date.day()];
    if (blocked_off.length === 0) {
      return [minmax];
    }
    var earliest = this.HandleBlockedOffTime(blocked_off, minmax[0]);
    var interval = [earliest, earliest];
    var intervals = [];
    while (earliest <= minmax[1]) {
      var next_time = this.HandleBlockedOffTime(blocked_off, earliest + this.cfg.TIME_STEP);
      if (next_time != earliest + this.cfg.TIME_STEP || next_time > minmax[1]) {
        intervals.push(interval);
        interval = [next_time, next_time];
      } else {
        interval[1] = next_time;
      }
      earliest = next_time;
    }
    return intervals;
  }

  this.GetFirstAvailableTime = function (date, service, size, cart_based_lead_time) {
    // param date: the date we're looking for the earliest time, as a moment
    // param service: the service type enum
    // param size: the order size
    // param cart_based_lead_time: any minimum preorder times associated with the specific items in the cart
    const internal_formatted_date = date.format(DATE_STRING_INTERNAL_FORMAT);
    var blocked_off = this.GetBlockedOffForDate(internal_formatted_date, service);
    var minmax = this.cfg.HOURS_BY_SERVICE_TYPE[service][date.day()];
    // cart_based_lead_time and service/size lead time don't stack
    var leadtime = Math.max(this.cfg.LEAD_TIME[service] + ((size - 1) * this.cfg.ADDITIONAL_PIE_LEAD_TIME), cart_based_lead_time);

    const current_time_plus_leadtime = moment(timing_info.current_time).add(leadtime, 'm');
    if (this.IsFirstDatePreviousDayToSecond(date, current_time_plus_leadtime)) {
      // if by adding the lead time we've passed the date we're looking for
      return minmax[1] + this.cfg.TIME_STEP;
    }

    if (internal_formatted_date === current_time_plus_leadtime.format(DATE_STRING_INTERNAL_FORMAT)) {
      var current_time_plus_leadtime_mins_from_start = this.DateToMinutes(current_time_plus_leadtime);
      if (current_time_plus_leadtime_mins_from_start > minmax[0]) {
        return this.HandleBlockedOffTime(blocked_off, Math.ceil((current_time_plus_leadtime_mins_from_start) / this.cfg.TIME_STEP) * this.cfg.TIME_STEP);
      }
    }
    return this.HandleBlockedOffTime(blocked_off, minmax[0]);
  };

  this.DisableExhaustedDates = function (date, service, size, cart_based_lead_time) {
    // checks if orders can still be placed for the
    // given date (moment), service type, and order size
    // param cart_based_lead_time: any minimum preorder times associated with the specific items in the cart
    // return: true if orders can still be placed, false otherwise
    var maxtime = this.cfg.HOURS_BY_SERVICE_TYPE[service][date.day()][1];
    return this.GetFirstAvailableTime(date, service, size, cart_based_lead_time) <= maxtime;
  };

  this.DisableFarOutDates = function (date) {
    // disables dates more than a year out from the current date
    const load_time_plus_year = moment(timing_info.current_time).add(1, 'y');
    return date.isBefore(load_time_plus_year, 'day');
  };

  this.IsDateActive = function (date, service, size, cart_based_lead_time) {
    // date is a moment
    return !this.IsPreviousDay(date) && this.DisableExhaustedDates(date, service, size, cart_based_lead_time) && this.DisableFarOutDates(date);
  };

  this.GetStartTimes = function (userDate, service, size, cart_based_lead_time) {
    // userDate is a moment
    var times = [];
    const internal_formatted_date = userDate.format(DATE_STRING_INTERNAL_FORMAT);
    var earliest = this.GetFirstAvailableTime(userDate, service, size, cart_based_lead_time);
    var blockedOff = this.GetBlockedOffForDate(internal_formatted_date, service);
    var latest = this.cfg.HOURS_BY_SERVICE_TYPE[service][userDate.day()][1];
    while (earliest <= latest) {
      times.push(earliest);
      earliest = this.HandleBlockedOffTime(blockedOff, earliest + this.cfg.TIME_STEP);
    }
    return times;
  };
};

var wcporderhelper = new WCPOrderHelper();

var FixQuantity = function (val, clear_if_invalid, min, max) {
  if (typeof val === "string" || val instanceof String) {
    val = parseInt(val);
  }
  if (clear_if_invalid) {
    if (!Number.isSafeInteger(val) || val < min) {
      val = min;
    }
    if (val > max) {
      val = max;
    }
  }
  return val;
};

function UpdateLeadTime() {
  if (wcporderhelper.IsDateActive(timing_info.current_time, wcpconfig.PICKUP, 1, 0)) {
    var first = wcporderhelper.GetFirstAvailableTime(timing_info.current_time, wcpconfig.PICKUP, 1, 0);
    $j("span.leadtime").html("Next available same-day order: " + wcporderhelper.MinutesToPrintTime(first, wcpconfig.PICKUP));
  } else {
    $j("span.leadtime").html("");
  }
}

(function () {
  var app = angular.module("WCPOrder", ['ngSanitize', 'ngMaterial', 'btford.socket-io', 'angularjsToast']);

  app.filter('TrustAsHTML', ['$sce', function ($sce) {
    return function (val) {
      return $sce.trustAsHtml(val);
    };
  }]);
  
  app.filter("MinutesToPrintTime", function () {
    return wcporderhelper.MinutesToPrintTime;
  });

  app.factory('socket', function ($rootScope) {
    var socket = io.connect(`${WARIO_ENDPOINT}nsRO`);
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      }
    };
  });

  app.service("OrderHelper", WCPOrderHelper);

  var WCPOrderState = function (cfg) {

    this.ClearCredit = function () {
      this.credit = {
        code: "",
        validation_successful: false,
        validation_processing: false,
        validation_fail: false,
        amount: 0.00,
        amount_used: 0.00,
        type: "MONEY",
        encoded: {}
      };
    }
    this.ReinitializeAccordion = function () {
      this.accordionstate = Array.apply(null, Array(cfg.MENU.categories[EXTRAS_CATID].children.length)).map(function (x, i) { return i === 0; });
    }

    this.RecomputeOrderSize = function () {
      var size = 0;
      for (var i = 0; i < this.cart[PIZZAS_CATID].length; ++i) {
        size = size + this.cart[PIZZAS_CATID][i].quantity;
      }
      this.num_pizza = size;
    };

    this.ComputeSubtotal = function () {
      var val = 0;
      for (var cid in this.cart) {
        for (var i = 0; i < this.cart[cid].length; ++i) {
          val += this.cart[cid][i].quantity * this.cart[cid][i].pi.price;
        }
      }
      this.computed_subtotal = val;
    }

    this.updateCustomTipInternal = function () {
      var val = this.custom_tip_value;
      if (typeof val === "string" || val instanceof String) {
        val = parseFloat(val);
      }
      if (val === null || val === undefined || val < 0.0) {
        val = 0.0;
      }
      val = RoundToTwoDecimalPlaces(val);
      this.custom_tip_value = val;
      this.tip_value = val;
    }

    this.selectPercentageTip = function (idx) {
      this.tip_clean = false;
      this.selected_tip = idx;
      this.show_custom_tip_input = false;
      var compute_tip_from = this.computed_subtotal + this.computed_tax + this.delivery_fee;
      var newtip = RoundToTwoDecimalPlaces(this.tip_options[idx] * compute_tip_from);
      this.custom_tip_value = this.custom_tip_value < newtip ? newtip : this.custom_tip_value;
      this.tip_value = newtip;
      this.TotalsUpdate();
    }

    this.selectCustomTip = function () {
      // set it to the index of the last percentage + 1
      this.tip_clean = false;
      this.selected_tip = this.tip_options.length;
      this.show_custom_tip_input = true;
      this.updateCustomTipInternal();
      this.TotalsUpdate();
    }

    // call this after an address is validated (or not)
    this.SetDeliveryState = function (validated) {
      if (validated) {
        this.is_address_validated = true;
        this.delivery_fee = 0;//5;
        this.autograt = .2;
        this.address_invalid = false;
        this.TotalsUpdate();
      }
      else {
        this.is_address_validated = false;
        this.address_invalid = true;
      }
    };

    this.TotalsUpdate = function () {
      // must run with up to date subtotal and order size;
      const pre_tax_monies = this.computed_subtotal + this.delivery_fee;
      var pre_tax_store_credit = 0;
      this.credit.amount_used = 0;
      if (this.credit.validation_successful && this.credit.type === "DISCOUNT") {
        pre_tax_store_credit = Math.min(this.credit.amount, pre_tax_monies);
        this.credit.amount_used = pre_tax_store_credit;
      }
      this.computed_tax = RoundToTwoDecimalPlaces((pre_tax_monies - pre_tax_store_credit) * cfg.TAX_RATE);
      this.autograt = this.num_pizza >= 5 || this.service_type === cfg.DELIVERY || this.service_type === cfg.DINEIN ? .2 : 0;
      var compute_tip_from = pre_tax_monies + this.computed_tax;
      var mintip = RoundToTwoDecimalPlaces(compute_tip_from * this.autograt);
      if (this.tip_clean) {
        this.custom_tip_value = RoundToTwoDecimalPlaces(compute_tip_from * .2);
        this.tip_value = this.tip_value < mintip ? mintip : 0;
      }
      else {
        if (this.tip_value < mintip) {
          //if autograt, set selected to autograt level if dirty value is below autograt level
          this.selected_tip = 1;
          this.show_custom_tip_input = false;
          this.tip_value = mintip;
          this.custom_tip_value = mintip;
        }
        else if (this.selected_tip === this.tip_options.length - 1 && this.autograt === 0) {
          // in the case someone has selected a tip level above a previously required autograt but doesn't have autograt
          // set the tip to a custom value equalling their previously selected value
          this.custom_tip_value = this.tip_value;
          this.selectCustomTip();
        }
      }
      this.custom_tip_value = this.custom_tip_value < mintip ? mintip : this.custom_tip_value;
      this.total = pre_tax_monies + this.computed_tax + this.tip_value;
      this.total = RoundToTwoDecimalPlaces(this.total);
      let post_tax_credit_used = 0;
      // TODO: handle case where discount credit is used to apply to tip, adding the value to amount_used almost does it
      if (this.credit.validation_successful && this.credit.type == "MONEY") {
        post_tax_credit_used = Math.min(this.credit.amount, this.total);
        this.credit.amount_used = this.credit.amount_used + post_tax_credit_used;
      }
      this.balance = this.total - post_tax_credit_used - pre_tax_store_credit;
    }

    // dumb function that gets a cart we can iterate over in the proper order (pizzas first then the rest) so we can still use crappy tables
    // this would be a great thing to get rid of.
    this.GenerateLinearCart = function() {
      var pizza_portion = [];
      var extras_portion = [];
      for (var catid in this.cart) {
        for (var i = 0; i < this.cart[catid].length; ++i) {
          var entry = this.cart[catid][i];
          catid === PIZZAS_CATID ? pizza_portion.push(entry) : extras_portion.push(entry);
        }
      }
      this.linear_cart = pizza_portion.concat(extras_portion);
    }

    this.StatePostCartUpdate = function () {
      this.GenerateLinearCart();
      this.RecomputeOrderSize();
      this.ComputeSubtotal();
      this.TotalsUpdate();
    }

    this.CartToDTO = function () {
      const dto = {};
      for (var cid in this.cart) {
        dto[cid] = this.cart[cid].map(function (x) { return [x.quantity, x.pi.ToDTO(cfg.MENU)] });
      }
      return dto;
    }

    this.SubmitToWarioInternal = function (http_provider, state, nonce) {
      var onSuccess = function (response) {
        console.log(response);
        state.payment_info = response.data;
        if (response.status == 200) {
          state.isPaymentSuccess = response.data.result && response.data.result.payment && response.data.result.payment.status == "COMPLETED";
          state.stage = 7;
        }
        else {
          // display server side card processing errors 
          state.card_errors = []
          var errors = JSON.parse(response.data.result);
          for (var i = 0; i < errors.length; i++) {
            state.card_errors.push({ message: errors[i].detail })
          }
          state.submit_failed = true;
        }
        state.isProcessing = false;
      };
      var onFail = function (response) {
        state.submit_failed = true;
        state.payment_info = response.data;
        state.isPaymentSuccess = false;
        state.isProcessing = false;
        if (response.data && response.data.result) {
          state.card_errors = [];
          var errors = JSON.parse(response.data.result).errors;
          for (var i = 0; i < errors.length; i++) {
            state.card_errors.push({ message: errors[i].detail })
          }
        } else {
          state.card_errors = [{ message: "Processing error! Send us a text so we can help look into the issue." }];
        }
        console.log("FAILWHALE");
      };

      state.isProcessing = true;
      http_provider({
        method: "POST",
        url: `${WARIO_ENDPOINT}api/v1/order`,
        data: {
          nonce: nonce,
          service_option: state.service_type,
          service_date: state.selected_date.format(DATE_STRING_INTERNAL_FORMAT),
          service_time: state.service_time,
          customer_name: SanitizeIfExists(`${state.customer_name_first} ${state.customer_name_last}`),
          phonenum: state.phone_number,
          delivery_info: {
            address1: state.delivery_address,
            address2: state.delivery_address_2,
            instructions: SanitizeIfExists(state.delivery_instructions),
            validated_delivery_address: state.validated_delivery_address,
            validation_result: state.address_validation_result
          },
          user_email: state.email_address,
          sliced: state.slice_pizzas,
          number_guests: state.number_guests,
          products: state.CartToDTO(),
          short_cart_list: state.short_cart_list,
          special_instructions: SanitizeIfExists(state.special_instructions),
          totals: {
            delivery_fee: state.delivery_fee,
            autograt: state.autograt,
            subtotal: state.computed_subtotal,
            tax: state.computed_tax,
            tip: state.tip_value,
            total: state.total,
            balance: state.balance
          },
          store_credit: state.credit,
          referral: SanitizeIfExists(state.referral),
          load_time: state.debug_info.load_time,
          time_selection_time: state.debug_info["time-selection-time"] ? state.debug_info["time-selection-time"].format("H:mm:ss") : "",
          submittime: moment().format("MM-DD-YYYY HH:mm:ss"),
          useragent: navigator.userAgent + " FEV13",
        }
      }).then(onSuccess).catch(onFail);
    }

    this.ValidateAndLockStoreCredit = function (http_provider, state) {
      var cached_code = state.credit.code;
      if (state.credit.validation_processing) {
        return;
      }
      state.credit.validation_processing = true;

      var onSuccess = function (response) {
        if (response.status === 200 && response.data.validated === true) {
          state.credit = {
            code: cached_code,
            validation_successful: true,
            validation_processing: false,
            validation_fail: false,
            amount: response.data.amount,
            amount_used: 0,
            type: response.data.credit_type,
            encoded: {
              enc: response.data.enc,
              iv: response.data.iv,
              auth: response.data.auth
            }
          };
          state.TotalsUpdate();
        }
        else {
          state.credit.validation_fail = true;
        }
      };
      var onFail = function (response) {
        state.credit.validation_processing = false;
        state.credit.validation_fail = true;
      };
      http_provider({
        method: "GET",
        url: `${WARIO_ENDPOINT}api/v1/payments/storecredit/validate`,
        params: { code: state.credit.code }
      }).then(onSuccess).catch(onFail);
    }

    this.date_string = ""; // friendly version of the date, for the UI
    this.date_valid = false;
    this.service_times = ["Please select a valid date"];
    this.debug_info = {};

    this.service_type = cfg.PICKUP;
    this.selected_date = ""; // the moment object of the selected date
    this.service_time = "Please select a valid date";
    this.customer_name_first = "";
    this.customer_name_last = "";
    this.phone_number = "";
    this.number_guests = 1;
    this.delivery_address = ""; // customer input, not validated
    this.delivery_address_2 = ""; // customer input, not validated/required
    this.delivery_zipcode = ""; // customer input, not validated
    this.delivery_instructions = ""; // customer input, not required
    this.validated_delivery_address = "";
    this.is_address_validated = false;
    this.address_invalid = false;
    this.address_validation_result = null;
    this.email_address = "";
    this.cart = {
    };
    this.slice_pizzas = false;
    this.num_pizza = 0;
    this.linear_cart = [];
    this.cart_based_lead_time = 0;
    this.referral = "";
    this.acknowledge_dine_in_terms = false;
    this.acknowledge_instructions_dialogue = false;
    this.special_instructions = "";
    this.special_instructions_responses = [];
    this.enable_split_toppings = ENABLE_SPLIT_TOPPINGS;
    this.EMAIL_REGEX = EMAIL_REGEX;

    this.delivery_fee = 0;
    this.autograt = 0;
    this.computed_subtotal = 0;
    this.computed_tax = 0;
    this.tip_value = 0;
    this.total = 0;
    this.tip_options = [.15, .2, .25, .3];
    this.selected_tip = 1;
    this.show_custom_tip_input = false;
    this.custom_tip_value = 0;
    this.tip_clean = true;
    this.payment_info = {};
    this.isPaymentSuccess = false;
    this.isProcessing = false;
    this.disableorder = false;
    this.credit = {};
    this.accordionstate = [];

    this.service_type_functors = [
      // PICKUP
      function (state) {
        return true;
      },
      // DINEIN
      function (state) {
        return ENABLE_DINE_IN;
      },
      // DELIVERY
      function (state) {
        return ENABLE_DELIVERY;
      }
    ];

    // stage 1: menu/cart controller: cart display // pie selection // customize pie, add to cart
    // stage 2: everything else
    // stage 3: customer name, phone, email address, address , referral info
    // stage 4: select service_type date/time
    // stage 5: review order, special instructions
    // stage 6: tip entering, payment
    // stage 7: pressed submit, waiting validation
    // stage 8: submitted successfully
    this.stage = 1;

    // flag for when submitting fails according to submission backend
    this.submit_failed = false;

    // flag for when too much time passes and the user's time needs to be re-selected
    this.selected_time_timeout = false;
  };

  app.controller("OrderController", ["OrderHelper", "$http", "$rootScope", "socket", "toast",
    function (OrderHelper, $http, $rootScope, $socket, toast) {
      this.ORDER_HELPER = OrderHelper;
      this.CONFIG = $rootScope.CONFIG = OrderHelper.cfg;
      this.ScrollTop = ScrollTopJQ;
      this.ScrollToID = ScrollToEIdJQ;
      this.s = $rootScope.state = new WCPOrderState(this.CONFIG);

      this.Reset = function () {
        this.s = $rootScope.state = new WCPOrderState(this.CONFIG);
      };

      this.ClearTimeoutFlag = function () {
        this.s.selected_time_timeout = false;
      }

      this.FilterServiceTypes = function (state) {
        var functors = this.s.service_type_functors;
        return function (item) {
          return functors[item[1]](state);
        }
      }

      this.ServiceTimeChanged = function () {
        // time has changed so log the selection time and clear the timeout flag
        this.s.debug_info["time-selection-time"] = moment(timing_info.current_time);
        this.ClearTimeoutFlag();
      };

      this.ClearAddress = function () {
        this.s.RecomputeOrderSize();
        this.s.delivery_zipcode = "";
        this.s.delivery_address = "";
        this.s.delivery_address_2 = "";
        this.s.delivery_instructions = "";
        this.s.validated_delivery_address = "";
        this.s.is_address_validated = false;
        this.s.address_invalid = false;
        this.s.delivery_fee = 0;
        this.s.autograt = this.s.num_pizza >= 5 ? .2 : 0;
        this.s.TotalsUpdate();
      };

      this.ClearSlicing = function () {
        this.s.slice_pizzas = false;
      };

      this.ClearSpecialInstructions = function () {
        this.s.special_instructions = "";
        this.s.disableorder = false;
      };

      this.ValidateDeliveryAddress = function () {
        $rootScope.state.address_invalid = false;

        var onSuccess = function (response) {
          if (response.status === 200 && response.data.found) {
            $rootScope.state.validated_delivery_address = response.data.validated_address;
            $rootScope.state.address_validation_result = response;
            if (response.data.in_area) {
              $rootScope.state.SetDeliveryState(true);
            }
          }
          else {
            $rootScope.state.SetDeliveryState(false);
          }
        };
        var onFail = function (response) {
          $rootScope.state.SetDeliveryState(false);
          console.log(response);
        };
        $http({
          method: "GET",
          url: `${WARIO_ENDPOINT}api/v1/addresses/validate`,
          params: { address: this.s.delivery_address, zipcode: this.s.delivery_zipcode, city: "Seattle", state: "WA" }
        }).then(onSuccess).catch(onFail);
      }

      this.PostChangeServiceType = function() {
        this.s.number_guests = 1;
        this.ValidateDate(); 
        this.ClearAddress(); 
        this.ClearSlicing();
      }

      this.ValidateDate = function () {
        // determines if a particular date (as input) is valid, and if so, populates the service dropdown
        var parsedDate = Date.parse(this.s.date_string);

        var no_longer_meets_service_requirement = !this.s.service_type_functors[this.s.service_type](this.s);

        if (no_longer_meets_service_requirement) {
          this.s.service_type = this.CONFIG.PICKUP;
          this.s.date_string = "";
        }
        if (no_longer_meets_service_requirement ||
          isNaN(parsedDate) ||
          !OrderHelper.IsDateActive(moment(parsedDate), this.s.service_type, this.s.num_pizza, this.s.cart_based_lead_time)) {
          this.s.date_valid = false;
          this.s.service_times = ["Please select a valid date"];
          this.s.service_time = "Please select a valid date";
        } else {
          // grab the old service_time the date was valid then one must have been selected
          var old_service_time = this.s.date_valid ? this.s.service_time : null;

          this.s.selected_date = moment(parsedDate);
          this.s.date_string = this.s.selected_date.format("dddd, MMMM DD, Y");
          this.s.date_valid = true;

          this.s.service_times = OrderHelper.GetStartTimes(this.s.selected_date, this.s.service_type, this.s.num_pizza, this.s.cart_based_lead_time);

          // don't use findindex here because of IE(all)
          if (!old_service_time || !this.s.service_times.some(function (elt, idx, arr) {
            return elt == old_service_time;
          })) {
            this.s.service_time = this.s.service_times[0];
            this.ServiceTimeChanged();
          }
        }
      };

      this.PostCartUpdate = function () {
        this.s.StatePostCartUpdate();
        this.ValidateDate();
      };

      this.ChangedEscapableInfo = function () {
        this.s.special_instructions = SanitizeIfExists(this.s.special_instructions);
        this.s.delivery_instructions = SanitizeIfExists(this.s.delivery_instructions);
        this.s.referral = SanitizeIfExists(this.s.referral);
      };

      this.ChangedContactInfo = function () {
        this.s.customer_name_first = SanitizeIfExists(this.s.customer_name_first);
        this.s.customer_name_last = SanitizeIfExists(this.s.customer_name_last);
        // resets the submit failed flag as the contact info has changed
        this.s.submit_failed = false;
      };

      // intermedite function that sees if we should be customizing this
      // product or add it directly to the cart
      this.SelectProduct = function(cid, pi, pmenuctrl) {
        if ((pi.display_flags && pi.display_flags.skip_customization) || !ProductHasSelectableModifiers(pi)) {
          var pi_copy = CopyWCPProduct(pi);
          pi_copy.piid = "";
          pi_copy.Initialize(this.CONFIG.MENU);
          this.ScrollToID("#accordion-" + String(cid), 0);
          this.AddToOrder(cid, pi_copy);
        }
        else {
          this.ScrollTop();
          pmenuctrl.SetProduct(cid, pi, true, false);
        }
      }

      this.FilterProducts = function(menu) {
        var current_time = moment();
        return function ( item ) {
          var passes = !item.display_flags.hide_from_menu && DisableDataCheck(item.disable_data, current_time);
          for (var mtid in item.modifiers) {
            passes = passes && Math.min(1, Math.min.apply(null, item.modifiers[mtid].map(function(x) {
              return DisableDataCheck(menu.modifiers[mtid].options[x[1]].disable_data, current_time);
            })));
          }
          return passes;
        }
      }

      this.FilterEmptyCategories = function(menu) {
        var filter_fxn = this.FilterProducts(menu);
        return function ( item ) {
          var cat_menu = menu.categories[item].menu;
          for (var i = 0; i < cat_menu.length; ++i) {
            if (filter_fxn(cat_menu[i])) {
              return true;
            }
          }
          return false;
        }
      }

      this.AddToOrder = function (cid, pi) {
        if (!this.s.cart.hasOwnProperty(cid)) {
          this.s.cart[cid] = [];
        }
        // check for existing entry
        for (var i in this.s.cart[cid]) {
          if (this.s.cart[cid][i].pi.Equals(pi, this.CONFIG.MENU)) {
            this.s.cart[cid][i].quantity += 1;
            toast.create({message: `Changed ${pi.name} quantity to ${this.s.cart[cid][i].quantity}.`} );
            this.PostCartUpdate();
            return;
          }
        }
        // add new entry
        // TODO: the modifiers length check isn't actually exhaustive as some modifiers might be disabled for any reason
        this.s.cart[cid].push(new CartEntry(cid, pi, 1, ProductHasSelectableModifiers(pi)));
        toast.create({message: `Added ${pi.name} to order.`} );
        this.PostCartUpdate();
      }

      this.UpdateOrderEntry = function(cart_entry, new_pi) {
        cart_entry.pi = new_pi;
        for (var i = 0; i < this.s.cart[cart_entry.catid].length; ++i) {
          if (cart_entry !== this.s.cart[cart_entry.catid][i] && this.s.cart[cart_entry.catid][i].pi.Equals(new_pi, this.CONFIG.MENU)) {
            cart_entry.quantity += this.s.cart[cart_entry.catid][i].quantity;
            this.s.cart[cart_entry.catid].splice(i, 1);
            toast.create({message: `Merged duplicate ${new_pi.name} in your order.`} );
            this.PostCartUpdate();
            return;
          }
        }
        toast.create({message: `Updated ${new_pi.name} in your order.`} );
        this.PostCartUpdate();
      }

      this.RevalidateItems = function () {
        //TODO
      }


      this.subtotal = function () {
        return this.s.computed_subtotal;
      };

      this.RemoveFromOrder = function (cart_entry) {
        var cart_idx = this.s.cart[cart_entry.catid].indexOf(cart_entry);
        this.s.cart[cart_entry.catid].splice(cart_idx, 1);
        this.PostCartUpdate();
      };

      this.fixQuantities = function (clear_if_invalid) {
        for (var cid in this.s.cart) {
          for (var i = 0; i < this.s.cart[cid].length; ++i) {
            this.s.cart[cid][i].quantity = FixQuantity(this.s.cart[cid][i].quantity, clear_if_invalid, 1, 99);
          }
        }
        this.PostCartUpdate();
      };

      this.fix_number_guests = function (clear_if_invalid) {
        this.s.number_guests = FixQuantity(this.s.number_guests, clear_if_invalid, 1, this.CONFIG.MAX_PARTY_SIZE);
      };

      this.updateCustomTip = function () {
        this.s.updateCustomTipInternal();
        this.s.TotalsUpdate();
      }

      this.computeDefaultTipIfClean = function () {
        if (this.s.tip_clean) {
          this.s.selectPercentageTip(this.s.selected_tip);
        }
        return true;
      }

      this.SlowSubmitterCheck = function () {
        var old_time = this.s.service_time;
        this.ValidateDate();
        // only bump someone to the time selection page if they're already at least that far
        if (old_time != this.s.service_time && this.s.stage >= 4) {
          // set flag for user notification that too much time passed
          this.s.selected_time_timeout = true;
          // if they're not at payment yet, bump them back to time selection for effect, unless the day expired
          if (this.s.stage < 6 || !this.s.date_valid) {
            // set stage to 4 (time selection)
            this.s.stage = 4;
          }
        }
      };
      this.NextStage = function () {
        this.s.stage = this.s.stage + 1;
        this.s.selected_time_timeout = false;
      };
      this.PreviousStage = function () {
        this.s.stage = this.s.stage - 1;
      };
      this.HasPreviousStage = function () {
        return this.s.stage > 1 && this.s.stage <= 6;
      };
      this.HasNextStage = function () {
        return this.s.stage < 7;
      };

      this.SubmitToWario = function () {
        return this.s.SubmitToWarioInternal($http, this.s, null);
      };

      this.ToggleUseStoreCredit = function () {
        this.s.ClearCredit();
        this.s.TotalsUpdate();
      };

      this.ValidateStoreCredit = function () {
        this.s.credit.validation_processing = false;
        this.s.credit.validation_fail = false;
        if (this.s.credit.code && this.s.credit.code.length === 19 && CREDIT_REGEX.test(this.s.credit.code)) {
          return this.s.ValidateAndLockStoreCredit($http, this.s);
        }
      };

      this.toggleAccordion = function (idx) {
        if (this.s.accordionstate[idx]) {
          this.s.accordionstate[idx] = false;
          return;
        }
        for (var i in this.s.accordionstate) {
          this.s.accordionstate[i] = i == idx;
        }
      };

      // this binding means we need to have this block here.
      var UpdateBlockedOffFxn = function (message) {
        this.CONFIG.UpdateBlockedOffVal(message);
        this.SlowSubmitterCheck();
        UpdateLeadTime();
      };
      var UpdateBlockedOffFxn = UpdateBlockedOffFxn.bind(this);
      $socket.on("WCP_BLOCKED_OFF", UpdateBlockedOffFxn);
      var UpdateOperatingHoursFxn = function (message) {
        this.CONFIG.UpdateOperatingHoursSettings(message);
        this.SlowSubmitterCheck();
        UpdateLeadTime();
      };
      var UpdateOperatingHoursFxn = UpdateOperatingHoursFxn.bind(this);
      $socket.on("WCP_SETTINGS", UpdateOperatingHoursFxn);
      const UpdateLeadTimeFxn = function (message) {
        this.CONFIG.UpdateLeadTimeVal(message);
        this.SlowSubmitterCheck();
        UpdateLeadTime();
      };
      const BoundUpdateLeadTimeFxn = UpdateLeadTimeFxn.bind(this);
      $socket.on("WCP_LEAD_TIMES", BoundUpdateLeadTimeFxn);
      var UpdateCatalogFxn = function (message) {
        this.CONFIG.UpdateCatalog(message);
        this.s.ReinitializeAccordion();
        this.RevalidateItems();

        this.SlowSubmitterCheck();
        UpdateLeadTime();
      };
      var UpdateCatalogFxn = UpdateCatalogFxn.bind(this);
      $socket.on("WCP_CATALOG", UpdateCatalogFxn);
    }]);

  app.controller("ProductMenuController", function ($scope, $mdDialog) {
    this.CONFIG = wcpconfig;
    this.selection = null;
    this.cart_entry = null;
    this.catid = null;
    this.is_addition = true;
    // flag indicating that there's at least one modifier for the selected product that has an advanced option available
    this.advanced_option_eligible = false;
    // flag indicating there's at least one modifier for the selected product that has an advanced option selected
    this.advanced_option_selected = false;
    // value tied to the toggle switch presented to the user
    this.allow_advanced = false;
    // reference to the controller for the currently selected advanced option
    $scope.advanced_option = this.advanced_option = null;
    // previous state of our advanced option
    $scope.advanced_option_previous_state = this.advanced_option_previous_state = 0;

    this.ShowAdvancedDialog = function($event) {
      var par = angular.element(document.body).find(".orderform");
      $mdDialog.show({
        parent: par,
        targetEvent: $event,
        contentElement: "#wcpoptionmodal",
        clickOutsideToClose: true,
        escapeToClose: true
      }).then(function() {
        // on confirm change
        $scope.advanced_option.modctrl.pmenuctrl.ConfirmAdvancedOption();
      }, function() {
        // on reject change
        $scope.advanced_option.modctrl.pmenuctrl.CancelAdvancedOption();
      });
    };
    //$scope.show_advanced_dialog = ShowAdvancedDialog;

    this.messages = [];
    this.errors = [];
    // mod map is { MTID: { has_selectable: boolean, meets_minimum: boolean, options: { MOID: {placement, enable_left, enable_right, enable_whole } } } }
    this.modifier_map = {};

    this.SetAdvancedOption = function($event, opt) { 
      $scope.advanced_option = this.advanced_option = opt;
      $scope.advanced_option_previous_state = this.advanced_option_previous_state = opt.placement;
      this.ShowAdvancedDialog($event);
    }
  
    this.CancelAdvancedOptionModal = function() {
      $mdDialog.cancel();
    }
    this.ConfirmAdvancedOptionModal = function() {
      $mdDialog.hide();
    }

    this.ConfirmAdvancedOption = function() {
      $scope.advanced_option = this.advanced_option = null;
      $scope.advanced_option_previous_state = this.advanced_option_previous_state = 0;
    }
    this.CancelAdvancedOption = function() { 
      $scope.advanced_option.UpdateOption($scope.advanced_option_previous_state, false);
      // TODO: remove this initalize call once the derived state is in a better situation
      $scope.advanced_option.Initialize();
      this.ConfirmAdvancedOption();
    }

    this.FilterModifiers = function (mods) {
      var result = {};
      var menu = this.CONFIG.MENU;
      angular.forEach(mods, function(value, mtid) {
        var modifier_entry = menu.modifiers[mtid];
        var disp_flags = modifier_entry.modifier_type.display_flags;
        var omit_section_if_no_available_options = disp_flags.omit_section_if_no_available_options;
        var hidden = disp_flags.hidden;
        // cases to not show:
        // modifier.display_flags.omit_section_if_no_available_options && (has selected item, all other options cannot be selected, currently selected items cannot be deselected)
        // modifier.display_flags.hidden is true
        if (!hidden && (!omit_section_if_no_available_options || value.has_selectable)) {
          result[mtid] = value;
        }
      });
      return result;
    }
    
    this.PopulateOrderGuide = function () {
      var menu = this.CONFIG.MENU;
      this.messages = [];
      if (this.selection && this.selection.PRODUCT_CLASS._id === PIZZA_PCID) {
        if (this.selection.bake_count[0] < ADD_SOMETHING_THRESHOLD || this.selection.bake_count[1] < ADD_SOMETHING_THRESHOLD) {
          this.messages.push(CONST_MESSAGE_ADD_MORE_TO_PIZZA);
        }
        if (this.selection.flavor_count[0] > 5 || this.selection.flavor_count[1] > 5) {
          this.messages.push("We love our toppings too, but adding this many flavors can end up detracting from the overall enjoyment. We'd suggest scaling this pizza back a bit. If this is your first time dining with us, we'd suggest ordering a menu pizza without modifications.");
        }
        if (GetPlacementFromMIDOID(this.selection, SAUCE_MTID, SAUCE_WHITE_OID) === TOPPING_WHOLE && GetPlacementFromMIDOID(this.selection, TOPPINGS_MTID, TOPPING_BLEU_OID) !== TOPPING_NONE) {
          this.messages.push("Our white sauce really lets the bleu cheese flavor come through. If you haven't had this pairing before, we'd suggest asking for light bleu cheese or switching back to red sauce.");
        }
      }
      var error_messages = [];
      angular.forEach(this.modifier_map, function(entry, mtid) {
        if (!entry.meets_minimum) {
          var modifier_entry = menu.modifiers[mtid];
          var mod_name = modifier_entry.modifier_type.display_name ? modifier_entry.modifier_type.display_name : modifier_entry.modifier_type.name
          error_messages.push(`Please select a ${String(mod_name).toLowerCase()}.`);
        }
      });
      this.errors = error_messages;
    };

    this.PostModifierChangeCallback = function (mid, oid, placement, is_from_advanced_modal) {
      var had_allowed_advanced_options = this.allow_advanced;
      this.SetProduct(this.catid, this.selection, this.is_addition, is_from_advanced_modal);
      this.allow_advanced = this.allow_advanced || had_allowed_advanced_options;
    }

    this.EditCartEntry = function(cart_entry) {
      var pi_copy = CopyWCPProduct(cart_entry.pi);
      pi_copy.Initialize(this.CONFIG.MENU);
      this.cart_entry = cart_entry;
      this.cart_entry.locked = true;
      this.SetProduct(cart_entry.catid, pi_copy, false, false);
    }

    this.SetProduct = function (catid, product_instance, is_new, is_from_advanced_modal /*, service_time*/) {
      // todo: address service_time piping
      var service_time = moment();
      this.selection = CopyWCPProduct(product_instance);
      // note: clearing the PIID allows things like a BYO pizza to show up as RED SAUCE + MOZZARELLA after it's added to the customizer
      this.selection.piid = "";
      this.selection.Initialize(this.CONFIG.MENU);
      this.catid = catid;
      this.is_addition = is_new;
      if (!is_from_advanced_modal) {
        this.advanced_option_eligible = false;
        this.advanced_option_selected = false;
        this.advanced_option = null;
      }
      var selection_modifiers_map = {};
      for (var mtidx = 0; mtidx < this.selection.PRODUCT_CLASS.modifiers2.length; ++mtidx) {
        var mtid = this.selection.PRODUCT_CLASS.modifiers2[mtidx].mtid;
        var modifier_type_enable_function = this.selection.PRODUCT_CLASS.modifiers2[mtidx].enable;
        // TODO: this is where front end needs to look at the modifier type enable function
        var modifier_entry = this.CONFIG.MENU.modifiers[mtid];
        // create the MOID: {placement: placement, enabled: { location: boolean } } } part of the map
        selection_modifiers_map[mtid] = { has_selectable: false, meets_minimum: false, options: {} };
        var enable_modifier_type = modifier_type_enable_function === null || WFunctional.ProcessProductInstanceFunction(this.selection, modifier_type_enable_function);
        for (var moidx = 0; moidx < modifier_entry.options_list.length; ++moidx) {
          var option_object = modifier_entry.options_list[moidx];
          var is_enabled = enable_modifier_type && DisableDataCheck(option_object.disable_data, service_time)
          var option_info = { 
            placement: TOPPING_NONE, 
            // do we need to figure out if we can de-select? answer: probably
            enable_left: is_enabled && option_object.can_split && option_object.IsEnabled(this.selection, this.CONFIG.LEFT, this.CONFIG.MENU),
            enable_right: is_enabled && option_object.can_split && option_object.IsEnabled(this.selection, this.CONFIG.RIGHT, this.CONFIG.MENU),
            enable_whole: is_enabled && option_object.IsEnabled(this.selection, this.CONFIG.WHOLE, this.CONFIG.MENU),
          };
          var enable_left_or_right = option_info.enable_left || option_info.enable_right;
          this.advanced_option_eligible = this.advanced_option_eligible || enable_left_or_right;
          selection_modifiers_map[mtid].options[option_object.moid] = option_info;
          selection_modifiers_map[mtid].has_selectable = selection_modifiers_map[mtid].has_selectable || enable_left_or_right || option_info.enable_whole;
        }
        var num_selected = 0;
        if (this.selection.modifiers.hasOwnProperty(mtid)) {
          num_selected = this.selection.modifiers[mtid].length;
          for (var moidx = 0; moidx < this.selection.modifiers[mtid].length; ++moidx) {
            var option_placement = this.selection.modifiers[mtid][moidx];
            selection_modifiers_map[mtid].options[option_placement[1]].placement = option_placement[0];
            this.advanced_option_selected = this.advanced_option_selected || (option_placement[0] !== TOPPING_WHOLE && option_placement[0] !== TOPPING_NONE);
          }
        }
        selection_modifiers_map[mtid].meets_minimum = !selection_modifiers_map[mtid].has_selectable || num_selected >= modifier_entry.modifier_type.min_selected;
      }
      this.allow_advanced = this.advanced_option_selected;
      this.modifier_map = selection_modifiers_map;
      this.PopulateOrderGuide();
    };


    this.UnsetProduct = function () {
      if (this.cart_entry !== null) {
        this.cart_entry.locked = false;
      }
      this.selection = null;
      this.cart_entry = null;
      this.catid = null;
      this.advanced_option = null;
      this.is_addition = true;
      this.messages = [];
    };

  });

  app.directive("wcppizzacartitem", function () {
    return {
      restrict: "E",
      scope: {
        prod: "=prod",
        dots: "=dots",
        price: "=price",
        allowadornment: "=allowadornment",
        description: "=description"
      },
      controller: function () { 
        this.ShowOptionsSections = function () {
          return !(this.prod.options_sections.length === 1 && this.prod.options_sections[0][1] === this.prod.name)
        }
        this.ShowAdornment = function () {
          return this.allowadornment && this.prod.display_flags && this.prod.display_flags.menu_adornment; 
        }
        this.PriceText = function () {
          if (this.prod.incomplete) {
            switch (this.prod.display_flags.price_display) {
              case "FROM_X": return `from ${this.prod.price}`;
              case "VARIES": return "MP";
              case "ALWAYS": default: return `${this.prod.price}`;
            }
          }
          return `${this.prod.price}`;
        }
      },
      controllerAs: "ctrl",
      bindToController: true,
      template: '<div ng-class="{\'menu-list__item-highlight-wrapper\': ctrl.ShowAdornment()}">'+
        '<span ng-if="ctrl.ShowAdornment()" class="menu-list__item-highlight-title" ng-bind-html="ctrl.prod.display_flags.menu_adornment | TrustAsHTML"></span>' +
        '<h4 class="menu-list__item-title"><span class="item_title">{{ctrl.prod.name}}</span><span ng-if="ctrl.dots" class="dots"></span></h4>' +
        '<p ng-if="ctrl.description && ctrl.prod.description" class="menu-list__item-desc">' +
        '<span class="desc__content">' +
        '<span>{{ctrl.prod.description}}</span>' +
        '</span>' +
        '</p>' +
        '<p ng-if="ctrl.description && ctrl.ShowOptionsSections()" ng-repeat="option_section in ctrl.prod.options_sections" class="menu-list__item-desc">' +
        '<span class="desc__content">' +
        '<span ng-if="ctrl.prod.is_split"><strong>{{option_section[0]}}: </strong></span>' +
        '<span>{{option_section[1]}}</span>' +
        '</span>' +
        '</p>' +
        '<span ng-if="ctrl.dots" class="dots"></span>' +
        '<span ng-if="ctrl.price" class="menu-list__item-price">{{ctrl.PriceText()}}</span>' +
        '</div>',
    };
  });

  var MODDISP_RADIO = 0;
  var MODDISP_TOGGLE = 1;
  var MODDISP_CHECKBOX = 2;
  app.directive("wcpmodifierdir", function () {
    return {
      restrict: "A",
      scope: {
        mtid: "=mtid",
        selection: "=selection",
        config: "=config",
        allowsplit: "=allowsplit",
        pmenuctrl: "=pmenuctrl",
        //servicetime: "=servicetime"
      },
      controllerAs: "ctrl",
      bindToController: true,
      controller: function () {
        this.Initialize = function () {
          // todo: deal with servicetime
          var service_time = moment();//this.servicetime;
          var menu = this.config.MENU;
          var modmap = this.pmenuctrl.modifier_map;
          var mtid = this.mtid;
          // determine list of visible options
          var filtered_options = menu.modifiers[this.mtid].options_list.filter(function (x) {
            return DisableDataCheck(x.disable_data, service_time);
          })
          if (menu.modifiers[this.mtid].modifier_type.display_flags.omit_options_if_not_available) {
            var filterfxn = function (x) {
              var modmap_entry = modmap[mtid].options[x.moid];
              return modmap_entry.enable_left || modmap_entry.enable_right || modmap_entry.enable_whole;
            };
            filtered_options = filtered_options.filter(filterfxn);
          }
          this.visible_options = filtered_options;

          // determines display type
          // determines product base if this is a toggle style modifier
          if (menu.modifiers[this.mtid].modifier_type.max_selected === 1) {
            if (menu.modifiers[this.mtid].modifier_type.min_selected === 1) {
              if (menu.modifiers[this.mtid].modifier_type.display_flags && menu.modifiers[this.mtid].modifier_type.display_flags.use_toggle_if_only_two_options &&
                this.visible_options.length === 2) {
                var BASE_PRODUCT_INSTANCE = menu.product_classes[this.selection.PRODUCT_CLASS._id].instances_list.find(function (prod) { return prod.is_base === true; });
                console.assert(BASE_PRODUCT_INSTANCE, `Cannot find base product instance of ${JSON.stringify(this.selection)}.`);
                var base_moid = BASE_PRODUCT_INSTANCE.modifiers.hasOwnProperty(this.mtid) && BASE_PRODUCT_INSTANCE.modifiers[this.mtid].length === 1 ? BASE_PRODUCT_INSTANCE.modifiers[this.mtid][0][1] : "";
                var base_option = base_moid ? menu.modifiers[this.mtid].options[base_moid] : null;
                if (!base_option || !this.visible_options.some(function (x) { return x.moid == base_moid; })) {
                  // the base product's option ${base_moid} isn't visible. switching to RADIO modifier display for ${this.mtid}`);
                  this.display_type = MODDISP_RADIO;
                }
                else {
                  this.display_type = MODDISP_TOGGLE;
                  var toggle_on_option = this.visible_options.find(function(x) { return x.moid != base_moid; });
                  console.assert(toggle_on_option, "should have found an option for the toggle!");
                  this.toggle_values = [base_option, toggle_on_option];
                }
                // sets the current single value to the MOID of the current selection
                this.current_single_value = this.selection.modifiers.hasOwnProperty(this.mtid) && this.selection.modifiers[this.mtid].length === 1 ? this.selection.modifiers[this.mtid][0][1] : "";
              }
              else {
                this.display_type = MODDISP_RADIO;
                this.current_single_value = this.selection.modifiers.hasOwnProperty(this.mtid) && this.selection.modifiers[this.mtid].length === 1 ? this.selection.modifiers[this.mtid][0][1] : "";
              }
            }
            else { // if (menu.modifiers[this.mtid].modifier_type.min_selected === 0)
              // checkbox that kinda functions like a radio button
              this.display_type = MODDISP_CHECKBOX;
            }
          }
          else {
            this.display_type = MODDISP_CHECKBOX;
          }
        };

        this.PostModifyCallback = function (moid, placement, is_from_advanced_modal) { 
          //console.log(`placement ${placement} of option ${JSON.stringify(moid)}`);
          if (!this.pmenuctrl.selection.modifiers.hasOwnProperty(this.mtid)) {
            this.pmenuctrl.selection.modifiers[this.mtid] = [];
          }
          if (this.display_type === MODDISP_CHECKBOX) {
            if (placement === TOPPING_NONE) {
              this.pmenuctrl.selection.modifiers[this.mtid] = this.pmenuctrl.selection.modifiers[this.mtid].filter(function(x) { return x[1] != moid; });
            }
            else {
              if (this.config.MENU.modifiers[this.mtid].modifier_type.min_selected === 0 && 
                this.config.MENU.modifiers[this.mtid].modifier_type.max_selected === 1) {
                // checkbox that requires we unselect any other values since it kinda functions like a radio
                this.pmenuctrl.selection.modifiers[this.mtid] = [];
              }
              var moidx = this.pmenuctrl.selection.modifiers[this.mtid].findIndex(function(x) { return x[1] == moid; });
              if (moidx === -1) {
                this.pmenuctrl.selection.modifiers[this.mtid].push([placement, moid]);
              }
              else {
                this.pmenuctrl.selection.modifiers[this.mtid][moidx][0] = placement;
              }
            }
          }
          else { // display_type === MODDISP_TOGGLE || display_type === MODDISP_RADIO
            if (this.display_type === MODDISP_TOGGLE) {
              this.pmenuctrl.selection.modifiers[this.mtid] = [[TOPPING_WHOLE, this.toggle_values[this.current_single_value].moid]];
            }
            else {
              this.pmenuctrl.selection.modifiers[this.mtid] = [[TOPPING_WHOLE, this.current_single_value]];
            }
          }
          this.pmenuctrl.PostModifierChangeCallback(this.mtid, moid, placement, is_from_advanced_modal);
        };
        this.Initialize();
      },
      template: '\
      <div>{{ctrl.config.MENU.modifiers[ctrl.mtid].modifier_type.display_name ? ctrl.config.MENU.modifiers[ctrl.mtid].modifier_type.display_name : ctrl.config.MENU.modifiers[ctrl.mtid].modifier_type.name}}:</div> \
      <div class="modifier flexitems"> \
        <div ng-if="ctrl.display_type !== 1" class="flexitem" ng-repeat="option in ctrl.visible_options" wcpoptiondir \
          selection="ctrl.selection" modctrl="ctrl" option="option" config="ctrl.config" allowadvanced="ctrl.pmenuctrl.allow_advanced"> \
        </div> \
        <div class="flexitem" ng-if="ctrl.display_type === 1"> \
          <input type="checkbox" id="{{ctrl.toggle_values[1].shortname}}_whole" class="input-whole" \
            ng-disabled="!ctrl.pmenuctrl.modifier_map[ctrl.mtid].options[ctrl.toggle_values[1].moid].enable_whole" \
            ng-model="ctrl.current_single_value" ng-true-value="1" \
            ng-false-value="0" ng-change="ctrl.PostModifyCallback(0, 0, false)"> \
          <span class="option-circle-container"> \
            <label for="{{ctrl.toggle_values[1].shortname}}_whole" class="option-whole option-circle"></label> \
          </span> \
          <label class="topping_text" for="{{ctrl.toggle_values[1].shortname}}_whole">{{ctrl.toggle_values[1].name}}</label> \
        </div> \
      </div>',
    }
});

app.directive("wcpoptiondir", function () {
  return {
    restrict: "A",
    scope: {
      option: "=option",
      selection: "=selection",
      config: "=config",
      // flag passed in from above saying we should show the advanced functionality, if available
      allowadvanced: "=allowadvanced",
      modctrl: "=modctrl",
    },
    controller: function () {
      this.GetEnableState = function () {
        // reference to the modifier map info for this particular option, READ ONLY
        return this.modctrl.pmenuctrl.modifier_map[this.modctrl.mtid].options[this.option.moid];
      }

      this.AdvancedOptionEligible = function () {
        var enable_state = this.GetEnableState();
        // TODO: likely need to remove the this.placement !== TOPPING_NONE check since it won't allow a half topping to be added if there's still room on one side
        // flag indicating there is an advanced option that could be selected, and we should show the button to access that
        return this.allowadvanced && this.modctrl.display_type === MODDISP_CHECKBOX && (enable_state.enable_left || enable_state.enable_right) && this.placement !== TOPPING_NONE;
      }

      this.Initialize = function () {
        this.MENU = this.config.MENU;
        var placement = GetPlacementFromMIDOID(this.selection, this.option.modifier._id, this.option.moid);
        this.placement = placement;
        this.advanced_option_selected = placement === TOPPING_LEFT || placement === TOPPING_RIGHT;
        this.left = placement === TOPPING_LEFT;
        this.right = placement === TOPPING_RIGHT;
        this.whole = placement === TOPPING_WHOLE;
      };

      this.UpdateOption = function (new_placement, is_from_advanced_modal) {
        this.modctrl.PostModifyCallback(this.option.moid, new_placement, is_from_advanced_modal);
        this.placement = new_placement;
        this.advanced_option_selected = new_placement === TOPPING_LEFT || new_placement === TOPPING_RIGHT;
      };

      this.WholePostProcess = function (is_from_advanced_modal) {
        this.left = this.right = false;
        var new_placement = (+this.right * TOPPING_RIGHT) + (+this.left * TOPPING_LEFT) + (+this.whole * TOPPING_WHOLE);
        this.UpdateOption(new_placement, is_from_advanced_modal);
      };

      this.LeftPostProcess = function(is_from_advanced_modal) {
        this.right = this.whole = false;
        this.UpdateOption((+this.left * TOPPING_LEFT), is_from_advanced_modal);
      }
      this.RightPostProcess = function(is_from_advanced_modal) {
        this.left = this.whole = false;
        this.UpdateOption((+this.right * TOPPING_RIGHT), is_from_advanced_modal);
      }

      this.Initialize();
    },
    controllerAs: 'ctrl',
    bindToController: true,
    // TODO we need to display whatever is the most appropriate button instead of just the whole toggle. 
    template: '<input type="radio" ng-if="ctrl.modctrl.display_type === 0" id="{{ctrl.option.shortname}}_whole" class="input-whole" ng-model="ctrl.modctrl.current_single_value" ng-value="ctrl.option.moid" ng-disabled="!ctrl.GetEnableState().enable_whole" ng-change="ctrl.UpdateOption(ctrl.config.WHOLE, false)" > \
      <input ng-if="ctrl.modctrl.display_type === 2" id="{{ctrl.option.shortname}}_whole" class="input-whole" ng-model="ctrl.whole" ng-disabled="!ctrl.GetEnableState().enable_whole" type="checkbox" ng-change="ctrl.WholePostProcess(false)"> \
        <input ng-if="ctrl.modctrl.display_type === 2" ng-show="ctrl.left || (!ctrl.GetEnableState().enable_whole && ctrl.GetEnableState().enable_left)" id="{{ctrl.option.shortname}}_left" class="input-left" ng-model="ctrl.left" ng-disabled="!ctrl.GetEnableState().enable_left" type="checkbox" ng-change="ctrl.LeftPostProcess(false)"> \
        <input ng-if="ctrl.modctrl.display_type === 2" ng-show="ctrl.right || (!ctrl.GetEnableState().enable_whole && ctrl.GetEnableState().enable_right)" id="{{ctrl.option.shortname}}_right" class="input-right" ng-model="ctrl.right" ng-disabled="!ctrl.GetEnableState().enable_right" type="checkbox" ng-change="ctrl.RightPostProcess(false)"> \
        <span class="option-circle-container"> \
        <label ng-show="!ctrl.advanced_option_selected" for="{{ctrl.option.shortname}}_whole" class="option-whole option-circle"></label> \
        <label ng-if="ctrl.modctrl.display_type === 2" ng-show="ctrl.left || (!ctrl.GetEnableState().enable_whole && ctrl.GetEnableState().enable_left)" for="{{ctrl.option.shortname}}_left" class="option-left option-circle"></label> \
        <label ng-if="ctrl.modctrl.display_type === 2" ng-show="ctrl.right || (!ctrl.GetEnableState().enable_whole && ctrl.GetEnableState().enable_right)" for="{{ctrl.option.shortname}}_right" class="option-right option-circle"></label> \
        </span> \
        <label class="topping_text" for="{{ctrl.option.shortname}}_whole" ng-disabled="!ctrl.GetEnableState().enable_whole">{{ctrl.option.name}}</label> \
        <button name="edit" ng-if="ctrl.AdvancedOptionEligible()" ng-click="ctrl.modctrl.pmenuctrl.SetAdvancedOption($event, ctrl)" class="button-sml"><div class="icon-gear"></div></button>' 
  };
});

app.directive("wcpoptiondetailmodaldir", function () {
  return {
    restrict: "A",
    scope: {
      optionctrl: "=optionctrl",
    },
    controller: function () {
    },
    controllerAs: 'ctrl',
    bindToController: true,
    template: '<md-dialog-content class="option-modal"><h2 class="option-modal-title">{{ctrl.optionctrl.option.name}} options</h2>\
        <div layout="row" layout-align="center center">\
        <div>Placement:</div><div></div>\
        <div><input id="{{ctrl.optionctrl.option.shortname}}_modal_whole" class="input-whole" ng-model="ctrl.optionctrl.whole" ng-disabled="!ctrl.optionctrl.GetEnableState().enable_whole" type="checkbox" ng-change="ctrl.optionctrl.WholePostProcess(true)"> \
        <input id="{{ctrl.optionctrl.option.shortname}}_modal_left" class="input-left" ng-model="ctrl.optionctrl.left" ng-disabled="!ctrl.optionctrl.GetEnableState().enable_left" type="checkbox" ng-change="ctrl.optionctrl.LeftPostProcess(true)"> \
        <input id="{{ctrl.optionctrl.option.shortname}}_modal_right" class="input-right" ng-model="ctrl.optionctrl.right" ng-disabled="!ctrl.optionctrl.GetEnableState().enable_right" type="checkbox" ng-change="ctrl.optionctrl.RightPostProcess(true)"> \
        <span class="option-circle-container"> \
          <label for="{{ctrl.optionctrl.option.shortname}}_modal_left" class="option-left option-circle"></label> \
        </span>\
        <span class="option-circle-container"> \
          <label for="{{ctrl.optionctrl.option.shortname}}_modal_whole" class="option-whole option-circle"></label> \
        </span>\
        <span class="option-circle-container"> \
          <label for="{{ctrl.optionctrl.option.shortname}}_modal_right" class="option-right option-circle"></label> \
        </span></div> \
        </div></md-dialog-content>\
        <md-dialog-actions>\
          <button name="cancel" class="btn" ng-click="ctrl.optionctrl.modctrl.pmenuctrl.CancelAdvancedOptionModal()">Cancel</button>\
          <span class="flex" flex></span>\
          <button class="btn" name="confirm" ng-click="ctrl.optionctrl.modctrl.pmenuctrl.ConfirmAdvancedOptionModal()">Confirm</button>\
        </md-dialog-actions>' 
  };
});

  app.directive("cf7bridge", ["$interval", "$window", function ($interval, $window) {
    return {
    restrict: "A",
      scope: {
    orderinfo: "=orderinfo",
      },
      link: function (scope, element, attrs) {
    // set load time field once
    scope.orderinfo.s.debug_info.load_time = timing_info.load_time.format("H:mm:ss");

        var ParseSpecialInstructionsAndPopulateResponses = function () {
    scope.orderinfo.s.special_instructions_responses = [];
          scope.orderinfo.s.disableorder = false;
          var special_instructions_lower = scope.orderinfo.s.special_instructions ? scope.orderinfo.s.special_instructions.toLowerCase() : "";
          if (wcpconfig.REQUEST_ANY && scope.orderinfo.s.acknowledge_instructions_dialogue && !(scope.orderinfo.s.service_type === wcpconfig.DINEIN && !wcpconfig.ENABLE_DINE_IN_PREPAYMENT)) {
    scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_ANY);
          }
          if (wcpconfig.REQUEST_HALF && (special_instructions_lower.indexOf("split") >= 0 || special_instructions_lower.indexOf("half") >= 0 || special_instructions_lower.indexOf("1/2") >= 0)) {
    scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_HALF);
          }
          if (wcpconfig.REQUEST_SLICING && (special_instructions_lower.indexOf("slice") >= 0 || special_instructions_lower.indexOf("cut") >= 0)) {
    scope.orderinfo.s.disableorder = true;
            scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_SLICING);
          }
          if (wcpconfig.REQUEST_SOONER && (special_instructions_lower.indexOf("soon") >= 0 || special_instructions_lower.indexOf("earl") >= 0 || special_instructions_lower.indexOf("time") >= 0) || special_instructions_lower.indexOf("asap") >= 0) {
    scope.orderinfo.s.disableorder = true;
            scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_SOONER);
          }
          if (wcpconfig.REQUEST_VEGAN && special_instructions_lower.indexOf("no cheese") >= 0 || special_instructions_lower.indexOf("vegan") >= 0 || special_instructions_lower.indexOf("without cheese") >= 0) {
    scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_VEGAN);
          }
        };
        scope.$watch("orderinfo.s.credit.code", function () {
    scope.orderinfo.ValidateStoreCredit();
        }, true);

        scope.$watch("orderinfo.s.special_instructions", function () {
    ParseSpecialInstructionsAndPopulateResponses();
        }, true);
        scope.$watch("orderinfo.s.acknowledge_instructions_dialogue", function () {
    ParseSpecialInstructionsAndPopulateResponses();
        }, true);
        function UpdateCurrentTime() {
          var time_diff = moment().valueOf() - timing_info.browser_load_time.valueOf();
          if (time_diff < timing_info.load_time_diff) {
            // cheater cheater
            location.reload();
          } else {
            timing_info.load_time_diff = time_diff;
          }
          timing_info.current_time = moment(timing_info.load_time.valueOf() + timing_info.load_time_diff);
          UpdateLeadTime();
          scope.orderinfo.SlowSubmitterCheck();
        }
        UpdateCurrentTime();
        UpdateLeadTime();
        var time_updater = $interval(UpdateCurrentTime, 30000);
        // check for return to window and update the time
        $window.document.onvisibilitychange = UpdateCurrentTime;
        $window.document.pageshow = UpdateCurrentTime;
        element.on("$destroy", function () {
    $interval.cancel(time_updater);
        });
      }
    };
  }]);

  app.directive("address", function () {
    return {
    require: "ngModel",
      link: function (scope, elm, attrs, ctrl) {
    ctrl.$validators.address = function (modelValue, viewValue) {
      if (ctrl.$isEmpty(modelValue)) {
        // consider empty models to be invalid
        return false;
      }
      return true;
    };
      }
    };
  });

  app.directive("zipcode", function () {
    return {
    require: "ngModel",
      link: function (scope, elm, attrs, ctrl) {
        var ZIPCODE_REGEX = /^\d{5}(?:[\-\s]\d{4})?$/;
        ctrl.$validators.zipcode = function (modelValue, viewValue) {
          if (ZIPCODE_REGEX.test(viewValue)) {
            // it is valid
            return true;
          }
          // it is invalid
          return false;
        };
      }
    };
  });


  app.directive("jqdatepicker", ["OrderHelper", function (OrderHelper) {
    return {
    restrict: "A",
      require: "ngModel",
      scope: {
    orderinfo: "=orderinfo",
      },
      link: function (scope, element, attrs, ctrl) {
        var DateActive = function (date) {
          var is_active = OrderHelper.IsDateActive(moment(date), scope.orderinfo.s.service_type, scope.orderinfo.s.num_pizza, scope.orderinfo.s.cart_based_lead_time);
          var tooltip = is_active ? "Your order can be placed for this date." : "Your order cannot be placed for this date.";
          return [is_active, "", tooltip];
        };
        $j(element).datepicker({
    dateFormat: "DD, MM dd, yy",
          minDate: -1,
          beforeShowDay: DateActive,
          onSelect: function (date) {
    ctrl.$setViewValue(date);
            ctrl.$render();
            scope.$apply();
          }
        });
      }
    };
  }]);

  app.directive("jqmaskedphone", function () {
    return {
    restrict: "A",
      require: "ngModel",
      link: function (scope, element, attrs, ctrl) {
    $j.mask.definitions['8'] = "[2-9]";
        $j(element).mask("(899) 999-9999");
      }
    };
  });

  app.directive("jqmaskedstorecredit", function () {
    return {
    restrict: "A",
      require: "ngModel",
      link: function (scope, element, attrs, ctrl) {
    $j.mask.definitions['C'] = "[A-Z0-9]";
        $j(element).mask("***-**-***-CCCCCCCC");
      }
    };
  });

  app.controller('PaymentController', ['$scope', '$rootScope', '$http', 'OrderHelper', function ($scope, $rootScope, $http, OrderHelper) {
    $scope.isBuilt = false;

    $scope.submitForm = function () {
    $rootScope.state.isProcessing = true;
      $scope.paymentForm.requestCardNonce();
      return false
    }

    $scope.paymentForm = new SqPaymentForm({
    applicationId: "sq0idp-5Sc3Su9vHj_1Xf4t6-9CZg",
      inputClass: 'sq-input',
      autoBuild: false,
      inputStyles: [{
    fontSize: '16px',
        lineHeight: '24px',
        padding: '16px',
        placeholderColor: '#a0a0a0',
        backgroundColor: 'transparent',
      }],
     card: {
    elementId: 'sq-card',
     },
      callbacks: {
    cardNonceResponseReceived: function (errors, nonce, cardData) {
          if (errors) {
    $rootScope.state.card_errors = errors
            $rootScope.state.isProcessing = false;
            $scope.$apply();
            $rootScope.$apply();
          } else {
    $rootScope.state.card_errors = []
            $scope.chargeCardWithNonce(nonce);
          }

        },
        unsupportedBrowserDetected: function () {
    alert("Unfortunately, your browser or settings don't allow for pre-payment. Please go back and select that you'd like to pay later or try your order on a newer browser.");
        }
      }
    });

    $scope.chargeCardWithNonce = function (nonce) {
      var data = {
    nonce: nonce,
        amount_money: $rootScope.state.total
      };
      return $rootScope.state.SubmitToWarioInternal($http, $rootScope.state, nonce);
    }

    $scope.buildForm = function () {
      if (!$scope.isBuilt) {
    $scope.isBuilt = true;
        $scope.paymentForm.build();
      }
      return $scope.isBuilt;
    }
  }]);

  $j("span.user-email input").on("blur", function (event) {
    $j(this).mailcheck({
      suggested: function (element, suggestion) {
        $j("div.user-email-tip").html("Did you mean <b><i>" + suggestion.full + "</i></b>?");
      },
      empty: function (element) {
        $j("div.user-email-tip").html("");
      }
    });
  });
})();