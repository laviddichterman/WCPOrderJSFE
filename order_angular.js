var $j = jQuery.noConflict();

var EMAIL_REGEX = new RegExp("^[_A-Za-z0-9\-]+(\\.[_A-Za-z0-9\-]+)*@[A-Za-z0-9\-]+(\\.[A-Za-z0-9\-]+)*(\\.[A-Za-z]{2,})$");

var DATE_STRING_INTERNAL_FORMAT = "YYYYMMDD";

var DELIVERY_INTERVAL_TIME = 30;

var WARIO_ENDPOINT = "https://wario.windycitypie.com/";

//var WARIO_ENDPOINT = "http://localhost:4001/";

function ScrollTopJQ() {
  $j("html, body").animate({
    scrollTop: $j("#ordertop").offset().top - 150
  }, 500);
}

var TimingInfo = function () {
  this.load_time = moment(new Date([WCP_blog_epoch_time]));
  this.current_time = this.load_time;
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

  // topping enums
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

  this.TAX_RATE = 0.101;

  this.LEAD_TIME = [45, 45, 1440];

  this.ADDITIONAL_PIE_LEAD_TIME = 5;

  this.TIME_STEP = 15;

  // menu related
  this.EXTRAS_MENU = extras_menu;
  this.PIZZA_MENU = pizza_menu;
  this.TOPPINGS = toppings_array;
  this.SAUCES = sauces;
  this.CHEESE_OPTIONS = cheese_options;
  this.CRUSTS = crusts;
  // END menu related

  // user messaging
  this.REQUEST_ANY = "By adding any special instructions, you will only be able to pay in person.";
  this.REQUEST_SLICING = "In order to ensure the quality of our pizzas, we will not slice them. We'd recommend bringing anything from a bench scraper to a butter knife to slice the pizza. Slicing the whole pizza when it's hot inhibits the crust from properly setting, and can cause the crust to get soggy both during transit and as the pie is eaten. We want your pizza to be the best possible and bringing a tool with which to slice the pie will make a big difference. You will need to remove this request to continue with your order.";
  this.REQUEST_VEGAN = "Our pizzas cannot be made vegan or without cheese. If you're looking for a vegan option, our Beets By Schrute salad can be made vegan by omitting the bleu cheese.";
  this.REQUEST_HALF = "While half toppings are not on the menu, we can do them (with the exception of half roasted garlic or half red sauce, half white sauce) but they are charged the same as full toppings. As such, we recommend against them as they're not a good value for the customer and an imbalance of toppings will cause uneven baking of your pizza.";
  this.REQUEST_SOONER = "It looks like you're trying to ask us to make your pizza sooner. While we would love to do so, the times you were able to select represents our real-time availability. Please send us a text if you're looking for your pizza earlier and it's not a Friday, Saturday, or Sunday, otherwise, you'll need to remove this request to continue with your order.";
  // END user messaging

  this.UpdateBlockedOffVal = function (bo) {
    this.BLOCKED_OFF = bo;
  }

  this.UpdateLeadTimeVal = function (lt) {
    this.LEAD_TIME = lt;
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

var FixQuantity = function (val, clear_if_invalid) {
  if (typeof val === "string" || val instanceof String) {
    val = parseInt(val);
  }
  if (clear_if_invalid && (!Number.isSafeInteger(val) || val < 1 || val > 99)) {
    val = 1;
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
  var app = angular.module("WCPOrder", ['btford.socket-io']);

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

  var WCPOrderState = function (cfg, enable_delivery, enable_split_toppings) {

    this.RecomputeOrderSize = function () {
      var size = 0;
      for (var i in this.cart.pizza) {
        size = size + this.cart.pizza[i][0];
      }
      this.num_pizza = size;
    };

    this.ComputeCartBasedLeadTime = function () {
      this.cart_based_lead_time = 0;
      for (var i in this.cart.pizza) {
        this.cart_based_lead_time = Math.max(this.cart_based_lead_time, this.cart.pizza[i][1].crust.leadtime);
      }
    };

    this.ComputeSubtotal = function () {
      var val = 0;
      for (var i in this.cart.pizza) {
        val += this.cart.pizza[i][0] * this.cart.pizza[i][1].price;
      }
      for (var j in this.cart.extras) {
        val += this.cart.extras[j][0] * this.cart.extras[j][1].price;
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
      val = parseFloat(val.toFixed(2));
      this.custom_tip_value = val;
      this.tip_value = val;
    }

    this.selectPercentageTip = function (idx) {
      this.tip_clean = false;
      this.selected_tip = idx;
      this.show_custom_tip_input = false;
      var compute_tip_from = this.computed_subtotal + this.computed_tax + this.delivery_fee;
      var newtip = this.tip_options[idx] * compute_tip_from;
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
      this.computed_tax = (this.delivery_fee + this.computed_subtotal) * cfg.TAX_RATE;
      this.autograt = this.num_pizza >= 5 || this.service_type === cfg.DELIVERY ? .2 : 0;
      var compute_tip_from = (this.computed_tax + this.delivery_fee + this.computed_subtotal);
      var mintip = compute_tip_from * this.autograt;
      mintip = parseFloat(mintip.toFixed(2));
      if (this.tip_clean) {
        this.custom_tip_value = compute_tip_from * .2
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
      this.total = this.computed_subtotal + this.computed_tax + this.delivery_fee + this.tip_value;
      this.total = parseFloat(this.total.toFixed(2));
    }

    this.StatePostCartUpdate = function () {
      this.RecomputeOrderSize();
      this.ComputeSubtotal();
      this.ComputeCartBasedLeadTime();
      this.TotalsUpdate();
    }

    this.CartToDTO = function() {
      const dto = {
        pizza: this.cart.pizza.map(function(x) { return [x[0], x[1].ToDTO()]}),
        extras: this.cart.extras.map(function(x) { return [x[0], { shortcode: x[1].shortcode, name: x[1].name } ]})
      };
      return dto;
    }

    this.SubmitToWarioInternal = function (http_provider, state) {

      var onSuccess = function (response) {
        if (response.status === 200) {
          state.stage = 8;
        }
        else {
          state.submit_failed = response;
          state.stage = 9;
          console.log("FAILWHALE");
        }
      };
      var onFail = function (response) {
        state.submit_failed = response;
        state.stage = 9;
        console.log("FAILWHALE");
      };
      state.stage = 7;
      http_provider({
        method: "POST",
        url: `${WARIO_ENDPOINT}api/v1/order/`,
        data: {
          service_option: state.service_type,
          service_date: state.selected_date.format(DATE_STRING_INTERNAL_FORMAT),
          service_time: state.service_time,
          customer_name: state.customer_name,
          phonenum: state.phone_number,
          delivery_info: {
            address1: state.delivery_address,
            address2: state.delivery_address_2,
            instructions: state.delivery_instructions,
            validated_delivery_address: state.validated_delivery_address,
            validation_result: state.address_validation_result
          },  
          user_email: state.email_address,
          sliced: state.slice_pizzas,
          products: state.CartToDTO(),
          short_cart_list: state.short_cart_list,
          special_instructions: state.special_instructions,
          totals: {
            delivery_fee: state.delivery_fee,
            autograt: state.autograt,
            subtotal: state.computed_subtotal,
            tax: state.computed_tax,
            tip: state.tip_value,
            total: state.total
          },
          address: state.formdata.address,
          referral: state.referral,
          load_time: state.formdata.load_time,
          time_selection_time: state.debug_info["time-selection-time"] ? state.debug_info["time-selection-time"].format("H:mm:ss") : "",
          submittime: moment().format("MM-DD-YYYY HH:mm:ss"),
          useragent: navigator.userAgent,
          ispaid: state.isPaymentSuccess,
          payment_info: state.payment_info
        }
      }).then(onSuccess).catch(onFail);
    }

    this.date_string = ""; // friendly version of the date, for the UI
    this.date_valid = false;
    this.service_times = ["Please select a valid date"];
    this.debug_info = {};

    this.service_type = cfg.PICKUP;
    this.selected_date = ""; // the moment object of the selected date
    this.service_time = "Please select a valid date";
    this.customer_name = "";
    this.phone_number = "";
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
      pizza: [],
      extras: []
    };
    this.slice_pizzas = false;
    this.cartstring = "";
    this.cartlist = [];
    this.num_pizza = 0;
    this.cart_based_lead_time = 0;
    this.shortcartstring = "";
    this.shortcartlist = [];
    this.referral = "";
    this.acknowledge_instructions_dialogue = false;
    this.special_instructions = "";
    this.special_instructions_responses = [];
    this.enable_split_toppings = false;
    this.enable_delivery = enable_delivery;
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

    this.formdata = {};

    this.service_type_functors = [
      // PICKUP
      function (state) {
        return true;
      },
      // DINEIN
      function (state) {
        return false;
      },
      // DELIVERY
      function (state) {
        return state.enable_delivery;
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

  app.controller("OrderController", ["OrderHelper", "$filter", "$http", "$location", "$scope", "$rootScope", "socket",
    function (OrderHelper, $filter, $http, $location, $scope, $rootScope, $socket) {
      this.ORDER_HELPER = OrderHelper;
      this.CONFIG = wcpconfig;
      this.toppings = toppings_array;
      this.sauces = sauces;
      this.cheese_options = cheese_options;
      this.crusts = crusts;
      this.split_toppings = $location.search().split === true;
      var enable_delivery = true;
      this.ScrollTop = ScrollTopJQ;
      this.s = $rootScope.state = new WCPOrderState(this.CONFIG, enable_delivery, this.split_toppings);

      this.Reset = function () {
        this.s = $rootScope.state = new WCPOrderState(this.CONFIG, enable_delivery, this.split_toppings);
      };

      this.ClearTimeoutFlag = function () { 
        this.s.selected_time_timeout = false;        
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

      this.ChangedContactInfo = function () {
        this.s.customer_name = this.s.customer_name.replace(/[\+\t\r\n\v\f]/g, '');
        // resets the submit failed flag as the contact info has changed
        this.s.submit_failed = false;
      };

      this.addPizzaToOrder = function (quantity, selection) {
        // check for existing entry
        for (var i in this.s.cart.pizza) {
          if (this.s.cart.pizza[i][1].Equals(selection)) {
            this.s.cart.pizza[i][0] += quantity;
            this.PostCartUpdate();
            return;
          }
        }
        // add new entry
        this.s.cart.pizza.push([quantity, selection]);
        this.PostCartUpdate();
      };

      this.removePizzaFromOrder = function (idx) {
        this.s.cart.pizza.splice(idx, 1);
        this.PostCartUpdate();
      };

      this.addExtraToOrder = function (selection) {
        // check for existing entry
        for (var i in this.s.cart.extras) {
          if (this.s.cart.extras[i][1].shortcode == selection.shortcode) {
            // note, dumb check here for equality
            this.s.cart.extras[i][0] += 1;
            this.PostCartUpdate();
            return;
          }
        }
        // add new entry
        this.s.cart.extras.push([1, selection]);
        this.PostCartUpdate();
      };

      this.removeExtraFromOrder = function (idx) {
        this.s.cart.extras.splice(idx, 1);
        this.PostCartUpdate();
      };

      this.subtotal = function () {
        return this.s.computed_subtotal;
      };

      this.fixQuantities = function (clear_if_invalid) {
        for (var item in this.s.cart.pizza) {
          this.s.cart.pizza[item][0] = FixQuantity(this.s.cart.pizza[item][0], clear_if_invalid);
        }
        for (var j in this.s.cart.extras) {
          this.s.cart.extras[j][0] = FixQuantity(this.s.cart.extras[j][0], clear_if_invalid);
        }
        this.PostCartUpdate();
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
          // if they're not at payment yet, bump them back to time selection for effect
          if (this.s.stage < 6) {
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
        return this.s.SubmitToWarioInternal($http, this.s);
      }

      // this binding means we need to have this block here.
      var UpdateBlockedOffFxn = function (message) {
        this.CONFIG.UpdateBlockedOffVal(message);
        this.SlowSubmitterCheck();
        UpdateLeadTime();
      };
      var UpdateBlockedOffFxn = UpdateBlockedOffFxn.bind(this);
      $socket.on("WCP_BLOCKED_OFF", UpdateBlockedOffFxn);
      const UpdateLeadTimeFxn = function (message) {
        this.CONFIG.UpdateLeadTimeVal(message);
        this.SlowSubmitterCheck();
        UpdateLeadTime();
      };
      const BoundUpdateLeadTimeFxn = UpdateLeadTimeFxn.bind(this);
      $socket.on("WCP_LEAD_TIMES", BoundUpdateLeadTimeFxn);
    }]);

  app.controller("AccordionController", function () {
    this.accordionstate = [];
    for (var i in wcpconfig.EXTRAS_MENU) {
      this.accordionstate.push(i == 0);
    }

    this.toggleAccordion = function (idx) {
      if (this.accordionstate[idx]) {
        return;
      }
      for (var i in this.accordionstate) {
        this.accordionstate[i] = i == idx;
      }
    };
  });

  app.controller("PizzaMenuController", function () {
    this.pizza_menu = wcpconfig.PIZZA_MENU;
    this.extras_menu = wcpconfig.EXTRAS_MENU;
    this.selection = null;
    this.quantity = 1;
    this.cheese_toggle = false;
    this.toppings = toppings_array;
    this.sauces = sauces;
    this.cheese_options = cheese_options;
      this.cheese_selection_mode = Object.keys(cheese_options).length;
    this.crusts = crusts;
    this.messages = [];
    this.suppress_guide = false;

    this.PopulateOrderGuide = function () {
      var addon_chz = this.selection.cheese_option != cheese_options.regular.shortname ? 1 : 0;
      var addon_crust = this.selection.crust.flavor.shortname != "regular" ? 1 : 0;
      this.messages = [];
      if (this.selection) {
        if (this.selection.crust.dough == crust_doughs.gf) {
          this.messages.push("Gluten free pizzas require 24 hour's notice and are baked in a kitchen exposed to wheat flour. While we take very thorough precautions, cross-contamination is a possibility.");
        }
        if (this.selection.bake_count[0] + addon_chz + addon_crust < 2 || this.selection.bake_count[1] + addon_chz + addon_crust < 2) {
          this.messages.push("Our pizza is designed as a vehicle for add-ons. We recommend at least two toppings to weigh the crust down during baking. If this is your first time dining with us, we'd suggest ordering a menu pizza without modifications.");
        }
        if (this.selection.flavor_count[0] + addon_crust > 5 || this.selection.flavor_count[1] + addon_crust > 5) {
          this.messages.push("We love our toppings too, but adding this many flavors can end up detracting from the overall enjoyment. We'd suggest scaling this pizza back a bit. If this is your first time dining with us, we'd suggest ordering a menu pizza without modifications.");
        }
        if (this.selection.sauce == sauces.white && this.selection.toppings_tracker[toppings_dict.bleu.index] != TOPPING_NONE) {
          this.messages.push("Our white sauce really lets the bleu cheese flavor come through. If you haven't had this pairing before, we'd suggest asking for light bleu cheese or switching back to red sauce.");
        }
      }
    };

    this.updateSelection = function () {
      if (this.cheese_selection_mode === 2) {
        this.selection.cheese_option = this.cheese_toggle ? this.cheese_options.ex_chz : this.cheese_options.regular;
      }
      this.selection.UpdatePie();
      this.PopulateOrderGuide();
    };

    this.setPizza = function (selectedPizza) {
      this.selection = WCPPizzaFromDTO(selectedPizza.ToDTO());
      this.quantity = 1;
      this.cheese_toggle = selectedPizza.cheese_option.shortcode == 'ex_chz';
      this.PopulateOrderGuide();
    };

    this.unsetPizza = function () {
      this.selection = null;
      this.quantity = 1;
      this.cheese_toggle = false;
    };

    this.fixQuantity = function () {
      this.quantity = FixQuantity(this.quantity, true);
    };
  });

  app.directive("wcppizzacartitem", function () {
    return {
      restrict: "E",
      scope: {
        pizza: "=pizza",
        dots: "=dots",
        price: "=price",
        description: "=description"
      },
      controller: function () { },
      controllerAs: "ctrl",
      bindToController: true,
      template: '<h4 class="menu-list__item-title"><span class="item_title">{{ctrl.pizza.name}}</span><span ng-if="ctrl.dots" class="dots"></span></h4>' +
        '<p ng-repeat="topping_section in ctrl.pizza.toppings_sections" class="menu-list__item-desc">' +
        '<span ng-if="ctrl.description && !ctrl.pizza.is_byo" class="desc__content">' +
        '<span ng-if="ctrl.pizza.is_split"><strong>{{topping_section[0]}}: </strong></span>' +
        '<span>{{topping_section[1]}}</span>' +
        '</span>' +
        '</p>' +
        '<span ng-if="ctrl.dots" class="dots"></span>' +
        '<span ng-if="ctrl.price" class="menu-list__item-price">{{ctrl.pizza.price}}</span>',
    };
  });

  app.directive("wcptoppingdir", function () {
    return {
      restrict: "A",
      scope: {
        topping: "=topping",
        selection: "=selection",
        config: "=config",
        split: "=split",
        pmenuctrl: "=pmenuctrl",
      },
      controller: function () {
        this.Initalize = function () {
          this.split = this.split;
          this.left = this.selection.toppings_tracker[this.topping.index] == 1;
          this.right = this.selection.toppings_tracker[this.topping.index] == 2;
          this.whole = this.selection.toppings_tracker[this.topping.index] == 3;
        };
        this.UpdateTopping = function () {
          this.selection.toppings_tracker[this.topping.index] = (+this.right) * 2 + (+this.left) + (+this.whole) * 3;
          this.pmenuctrl.updateSelection();
          this.selection.UpdatePie();
        };
        this.ToggleWhole = function () {
          this.left = this.right = false;
          this.UpdateTopping();
        };
        this.ToggleHalf = function () {
          if (this.left && this.right) {
            this.whole = true;
            this.left = this.right = false;
          } else {
            this.whole = false;
          }
          this.UpdateTopping();
        };

        this.Initalize();
      },
      controllerAs: 'ctrl',
      bindToController: true,
      template: '<input id="{{ctrl.topping.shortname}}_whole" class="input-whole" ng-model="ctrl.whole" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.WHOLE)" type="checkbox" ng-change="ctrl.ToggleWhole()">' +
        '<input ng-show="ctrl.split" id="{{ctrl.topping.shortname}}_left" class="input-left"  ng-model="ctrl.left" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.LEFT)" type="checkbox" ng-change="ctrl.ToggleHalf()">' +
        '<input ng-show="ctrl.split" id="{{ctrl.topping.shortname}}_right" class="input-right" ng-model="ctrl.right" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.RIGHT)" type="checkbox" ng-change="ctrl.ToggleHalf()">' +
        '<span class="option-circle-container">' +
        '<label for="{{ctrl.topping.shortname}}_whole" class="option-whole option-circle"></label>' +
        '<label ng-show="ctrl.split" for="{{ctrl.topping.shortname}}_left" class="option-left option-circle"></label>' +
        '<label ng-show="ctrl.split" for="{{ctrl.topping.shortname}}_right" class="option-right option-circle"></label>' +
        '</span>' +
        '<label class="topping_text" for="{{ctrl.topping.shortname}}_whole" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.WHOLE)">{{ctrl.topping.name}}</label>'
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
        var formatted_load_time = timing_info.load_time.format("H:mm:ss");
        scope.orderinfo.s.formdata.load_time = formatted_load_time;

        var ParseSpecialInstructionsAndPopulateResponses = function () {
          scope.orderinfo.s.special_instructions_responses = [];
          scope.orderinfo.s.disableorder = false;
          var special_instructions_lower = scope.orderinfo.s.special_instructions ? scope.orderinfo.s.special_instructions.toLowerCase() : "";
          if (wcpconfig.REQUEST_ANY && scope.orderinfo.s.acknowledge_instructions_dialogue) {
            scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_ANY);
          }
          if (wcpconfig.REQUEST_HALF && (special_instructions_lower.indexOf("split") >= 0 || special_instructions_lower.indexOf("half") >= 0 || special_instructions_lower.indexOf("1/2") >= 0)) {
            scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_HALF);
          }
          if (wcpconfig.REQUEST_SLICING && (special_instructions_lower.indexOf("slice") >= 0 || special_instructions_lower.indexOf("cut") >= 0)) {
            scope.orderinfo.s.disableorder = true;
            scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_SLICING);
          }
          if (wcpconfig.REQUEST_SOONER && (special_instructions_lower.indexOf("soon") >= 0 || special_instructions_lower.indexOf("earl") >= 0 || special_instructions_lower.indexOf("time") >= 0)) {
            scope.orderinfo.s.disableorder = true;
            scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_SOONER);
          }
          if (wcpconfig.REQUEST_VEGAN && special_instructions_lower.indexOf("no cheese") >= 0 || special_instructions_lower.indexOf("vegan") >= 0 || special_instructions_lower.indexOf("without cheese") >= 0) {
            scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_VEGAN);
          }
        };
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
        var time_updater = $interval(UpdateCurrentTime, 60000);
        $window.document.onvisibilitychange = UpdateCurrentTime;
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
            $scope.card_errors = errors
            $rootScope.state.isProcessing = false;
            $scope.$apply();
            $rootScope.$apply();
          } else {
            $scope.card_errors = []
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
      $http.post(`${WARIO_ENDPOINT}api/v1/payments/payment`, data).success(function (data, status) {
        if (status == 200) {
          $rootScope.state.isPaymentSuccess = true;
          $rootScope.state.payment_info = data;
          $rootScope.state.SubmitToWarioInternal($http, $rootScope.state);
        }
        else {
          // display server side card processing errors 
          $rootScope.state.isPaymentSuccess = false;
          $scope.card_errors = []
          var errors = JSON.parse(data.result);
          for (var i = 0; i < errors.length; i++) {
            $scope.card_errors.push({ message: errors[i].detail })
          }
        }
        $rootScope.state.isProcessing = false;
      }).error(function (data) {
        $rootScope.state.isPaymentSuccess = false;
        $rootScope.state.isProcessing = false;
        if (data && data.result) {
          $scope.card_errors = [];
          var errors = JSON.parse(data.result).errors;
          for (var i = 0; i < errors.length; i++) {
            $scope.card_errors.push({ message: errors[i].detail })
          }
        } else {
          $scope.card_errors = [{ message: "Processing error, please try again! If you continue to have issues, text us." }];
        }
      });
    }

    $scope.buildForm = function () {
      if (!$scope.isBuilt) {
        $scope.isBuilt = true;
        $scope.paymentForm.build();
      }
      return $scope.isBuilt;
    }
  }]);

  $j(".scrolltotop").click(function () {
    ScrollTopJQ();
  });

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