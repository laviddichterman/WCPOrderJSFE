var $j = jQuery.noConflict();

var EMAIL_REGEX = new RegExp("^[_A-Za-z0-9\-]+(\\.[_A-Za-z0-9\-]+)*@[A-Za-z0-9\-]+(\\.[A-Za-z0-9\-]+)*(\\.[A-Za-z]{2,})$");

var DATE_STRING_INTERNAL_FORMAT = "YYYYMMDD";

var DELIVERY_INTERVAL_TIME = 30;

var WARIO_ENDPOINT = "https://wario.breezytownpizza.com/";

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
  this.order_placed_during_dining = false;
};

var timing_info = new TimingInfo();

var BTPStoreConfig = function () {
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

  this.ALLOW_SLICING = true;
  this.FLAVOR_MAX = FLAVOR_MAX;
  this.BAKE_MAX = BAKE_MAX;

  // topping enums
  this.NONE = TOPPING_NONE;
  this.LEFT = TOPPING_LEFT;
  this.RIGHT = TOPPING_RIGHT;
  this.WHOLE = TOPPING_WHOLE;

  this.BLOCKED_OFF = [WCP_time_off];

  this.PICKUP_HOURS = [
    [16 * 60, 21 * 60], //sunday
    [16 * 60, 21 * 60], //monday
    [16 * 60, 21 * 60], //tuesday
    [16 * 60, 21 * 60], //wednesday
    [16 * 60, 21 * 60], //thursday
    [16 * 60, 21 * 60], //friday
    [16 * 60, 21 * 60] //saturday
  ];

  this.DINEIN_HOURS = [
    [12 * 60, 21 * 60], //sunday
    [16 * 60, 21 * 60], //monday
    [16 * 60, 21 * 60], //tuesday
    [16 * 60, 21 * 60], //wednesday
    [16 * 60, 21 * 60], //thursday
    [16 * 60, 20 * 60], //friday
    [12 * 60, 20 * 60] //saturday
  ];

  this.DELIVERY_HOURS = [
    [16 * 60, 21 * 60], //sunday
    [16 * 60, 21 * 60], //monday
    [16 * 60, 21 * 60], //tuesday
    [16 * 60, 21 * 60], //wednesday
    [16 * 60, 21 * 60], //thursday
    [16 * 60, 21 * 60], //friday
    [16 * 60, 21 * 60] //saturday
  ];

  this.HOURS_BY_SERVICE_TYPE = [
    this.PICKUP_HOURS,
    this.DINEIN_HOURS,
    this.DELIVERY_HOURS
  ];

  this.TAX_RATE = 0.101;

  this.LEAD_TIME = [WCP_leadtime];

  this.ADDITIONAL_PIE_LEAD_TIME = [WCP_incremental_leadtime];

  this.TIME_STEP = [WCP_time_step];

  // menu related
  this.EXTRAS_MENU = extras_menu;
  this.PIZZA_MENU = pizza_menu;
  this.TOPPINGS = toppings_array;
  this.SAUCES = sauces;
  this.CHEESE_OPTIONS = cheese_options;
  this.CRUSTS = crusts;
  this.MULTI_CRUST = false;
  // END menu related

  // user messaging
  this.AREA_CODES = {
    "217": true,
    "309": true,
    "312": true,
    "630": true,
    "331": true,
    "618": true,
    "708": true,
    "773": true,
    "815": true,
    "779": true,
    "847": true,
    "224": true,
    "872": true,
    "231": true,
    "248": true,
    "269": true,
    "313": true,
    "517": true,
    "586": true,
    "616": true,
    "734": true,
    "810": true,
    "906": true,
    "947": true,
    "989": true,
    "679": true,
  };
  this.NOTE_LOCATION = "inside Clock-Out Lounge (4864 Beacon Ave S, 98108) at the Breezy Town Pizza counter under the slice sign."
  this.NOTE_SPECIAL_INSTRUCTIONS = "Since you specified special instructions, we will let you know if we can accommodate your request. We may need your confirmation if your instructions will incur an additional cost or we cannot accommodate them, so please watch your email.";
  this.NOTE_KEEP_LEVEL = "Be sure to travel with your pizza as flat as possible, on the floor or in the trunk. Seats are generally not a level surface.";
  // show pickup
  this.NOTE_SHOW_POSSIBILITY = "";
  // 21+ hours
  this.NOTE_ADULT_HOURS_BTP = "Please note that we are all ages until 8pm after which we are a 21 and up venue. ";
  this.NOTE_PICKUP_BEFORE_DI = "Because of the symbiotic nature of our relationship with our friends, Clock-Out Lounge, we will not be able to allow pick-up inside but will be doing curbside pick-up. We will have someone available to assist you at the front door when you arrive.";
  this.NOTE_PICKUP_DURING_DI = this.NOTE_PICKUP_BEFORE_DI;
  this.NOTE_DI = "Please come to our counter and let us know the name under which your order was placed. Please arrive promptly so your pizza is as fresh as possible and you have time to get situated and get beverages.";
  this.NOTE_DELIVERY_BETA = "Our delivery service is now in beta. Delivery times are rough estimates and we will make every attempt to be prompt. We'll contact you to confirm the order shortly.";
  this.NOTE_DELIVERY_SERVICE = "We appreciate your patience as our in-house delivery service is currently in its infancy. Delivery times are estimated. We might be a little earlier, or a little later. A 20% gratuity will be applied and is distributed among the Breezy Town Pizza family.";
  this.NOTE_PAYMENT = "We happily accept any major credit card or cash for payment upon arrival.";
  this.NOTE_ALREADY_PAID = "You've already paid, so unless there's an issue with the order, there's no need to handle payment from this point forward.";
  this.REQUEST_HALF = "While half toppings are not on the menu, we can do them but they are charged the same as full toppings. As such, we recommend against them as they're not a good value for the customer and an imbalance of toppings will cause uneven baking of your pizza.";
  // END user messaging

  this.UpdateBlockedOffVal = function (bo) {
    this.BLOCKED_OFF = bo;
  }

  this.UpdateLeadTimeVal = function (lt) {
    this.LEAD_TIME = lt;
  }
  //END WCP store config
};

var wcpconfig = new BTPStoreConfig();

function FixOldBlockedOff() {
  for (var i in wcpconfig.BLOCKED_OFF) {
    for (var j in wcpconfig.BLOCKED_OFF[i]) {
      if (typeof wcpconfig.BLOCKED_OFF[i][j][0] != "String") {
        wcpconfig.BLOCKED_OFF[i][j][0] = moment(wcpconfig.BLOCKED_OFF[i][j][0]).format(DATE_STRING_INTERNAL_FORMAT);
      }
    }
  }
}
FixOldBlockedOff();

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

  this.IsIllinoisAreaCode = function (phone) {
    var numeric_phone = phone.match(/\d/g);
    numeric_phone = numeric_phone.join("");
    return (numeric_phone.length == 10 && (numeric_phone.slice(0, 3)) in this.cfg.AREA_CODES);
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

  this.RelationshipToDineInHour = function (date, time) {
    // return:
    //  0: before dine-in
    //  1: during dine-in
    //  2: after dine-in
    //  date is a moment
    var service_intervals = this.GetServiceIntervalsForDate(date, this.cfg.DINEIN);
    for (var i in service_intervals) {
      if (time >= service_intervals[i][0] && time <= service_intervals[i][1]) {
        return 1;
      }
    }
    return service_intervals.length && service_intervals[service_intervals.length - 1][1] < time ? 2 : 0;
  };

  this.AutomatedInstructionsBuilder = function (service_type, date, time, special_instructions, placed_during_dinein) {
    // date is a moment
    if (!date || !date.isValid() || isNaN(time)) {
      return "";
    }
    var has_special_instructions = special_instructions && special_instructions.length > 0;

    var response_time = placed_during_dinein ? "shortly" : "as soon as we're able";
    var special_instructions_note = has_special_instructions ? " " + this.cfg.NOTE_SPECIAL_INSTRUCTIONS : "";
    var non_delivery_preamble = "We'll get back to you " + response_time + " to confirm your order."; // + special_instructions_note;

    switch (service_type) {
      case this.cfg.DELIVERY:
        return this.cfg.NOTE_DELIVERY_BETA;
      case this.cfg.PICKUP:
        return non_delivery_preamble + "\n"; // + (service_during_dine_in ? this.cfg.NOTE_PICKUP_DURING_DI : this.cfg.NOTE_PICKUP_BEFORE_DI) + "\n" + this.cfg.NOTE_PAYMENT;
      case this.cfg.DINEIN:
        return non_delivery_preamble + "\n"; // + this.cfg.NOTE_DI + "\n" + this.cfg.NOTE_PAYMENT;
      default:
        console.assert(false, "invalid service value");
    }
  };

  this.EmailSubjectStringBuilder = function (service_type, name, date_string, service_time) {
    if (!name || name.length === 0 || !date_string || date_string.length === 0) {
      return "";
    }
    service_type = this.cfg.SERVICE_TYPES[service_type][0];
    service_time = this.MinutesToPrintTime(service_time, service_type);
    //[service-option] for [user-name] on [service-date] - [service-time]
    return encodeURI(service_type + " for " + name + " on " + date_string + " - " + service_time);
  };

  this.EmailBodyStringBuilder = function (service_type, date, time, phone, delivery_address, ispaid) {
    if (date === null || isNaN(time)) {
      return "";
    }
    //var show_possible  = this.DuringShowHours();
    var service_time_print = this.MinutesToPrintTime(time, service_type);
    var nice_area_code = this.IsIllinoisAreaCode(phone);
    var opener = nice_area_code ? "Hey, nice area code! " : "Thanks! ";
    var confirm_string_array = [];
    switch (service_type) {
      case this.cfg.DELIVERY:
        confirm_string_array = [
          opener,
          "We're happy to confirm your delivery for around ",
          service_time_print,
          ` to ${delivery_address}.\n\n`,
          this.cfg.NOTE_DELIVERY_SERVICE,
          " ",
          ispaid ? this.cfg.NOTE_ALREADY_PAID : this.cfg.NOTE_PAYMENT
        ];
        break;
      case this.cfg.PICKUP:
        confirm_string_array = [
          opener,
          "We've got your order and we'll see you at ",
          service_time_print,
          " ", this.cfg.NOTE_LOCATION, "\n\n",
          ispaid ? this.cfg.NOTE_ALREADY_PAID : this.cfg.NOTE_PAYMENT
        ];
        break;
      case this.cfg.DINEIN:
        confirm_string_array = [
          opener,
          "We're happy to confirm your order for ",
          service_time_print,
          " ", this.cfg.NOTE_LOCATION, "\n\n",
          this.cfg.NOTE_DI,
          " We do not reserve seating. ",
          this.cfg.NOTE_ADULT_HOURS_BTP,
          ispaid ? this.cfg.NOTE_ALREADY_PAID : this.cfg.NOTE_PAYMENT
        ];
        break;
      default:
        console.assert(false, "invalid service value");
        break;
    }
    return encodeURI(confirm_string_array.join(""));
  };

  this.EventTitleStringBuilder = function (service, customer, cart, special_instructions, sliced) {
    if (!customer || cart.pizza.length === 0) {
      return "";
    }
    var service_string = "";
    if (service == this.cfg.PICKUP) {
      service_string = "P" + (sliced ? "+SLICED" : "");
    } else if (service == this.cfg.DINEIN) {
      service_string = "DINE";
    } else if (service == this.cfg.DELIVERY) {
      service_string = "DELIVER";
    }

    var has_special_instructions = special_instructions && special_instructions.length > 0;

    var num_pizzas = 0;
    var pizza_shortcodes = "";
    for (var i in cart.pizza) {
      var quantity = cart.pizza[i][0];
      var shortcode = cart.pizza[i][1].shortcode;
      num_pizzas = num_pizzas + quantity;
      pizza_shortcodes = pizza_shortcodes + Array(quantity + 1).join(" " + shortcode);
    }
    var extras_shortcodes = "";
    for (var j in cart.extras) {
      var quantity = cart.extras[j][0];
      var shortcode = cart.extras[j][1].shortcode;
      extras_shortcodes = extras_shortcodes + " " + quantity.toString(10) + "x" + shortcode;
    }
    var pizzas_title = num_pizzas + "x" + pizza_shortcodes;
    var extras_title = extras_shortcodes.length > 0 ? " Extras" + extras_shortcodes : "";
    return service_string + " " + customer + " " + pizzas_title + extras_title + (has_special_instructions ? "*" : "");
  };

  this.EventDateTimeStringBuilder = function (date, time, service_type) {
    if (!date || !date.isValid() || isNaN(time) || time < 0) {
      return "";
    }
    var date_lower = moment(date);
    var date_upper = moment(date);
    time = String(time).split(",");
    date_lower.add(time[0], "minutes");
    if (time.length === 1) {
      date_upper = moment(date_lower);
      date_upper = service_type === wcporderhelper.cfg.DELIVERY ? date_upper.add(DELIVERY_INTERVAL_TIME, "minutes") : date_upper;
    } else {
      date_upper.add(time[1], "minutes");
    }
    return [date_lower.format("YYYY-MM-DDTHH:mm:ssZ"), date_upper.format("YYYY-MM-DDTHH:mm:ssZ")];
  };

  this.EventDetailStringBuilder = function (order, phone, special_instructions) {
    if (!order || !phone) {
      return "";
    }
    var es = order.replace(/[&]/g, "and") + "\nph: " + phone.replace(/\D/g, "");
    if (special_instructions.length > 0) {
      es = es + "\nSpecial Instructions:" + special_instructions;
    }
    return es;
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
      if (val === null || val < 0.0) {
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
    }

    this.StatePostCartUpdate = function () {
      this.RecomputeOrderSize();
      this.ComputeSubtotal();
      this.ComputeCartBasedLeadTime();
      this.TotalsUpdate();
    }

    this.SubmitToWarioInternal = function (http_provider, state) {

      var onSuccess = function (response) {
        if (response.status === 200) {
          state.stage = 8;
        }
        else {
          state.submit_failed = true;
          state.stage = 3;
          console.log("FAILWHALE");
        }
      };
      var onFail = function (response) {
        state.submit_failed = true;
        state.stage = 3;
        console.log("FAILWHALE");
      };
      state.stage = 7;
      http_provider({
        method: "POST",
        url: `${WARIO_ENDPOINT}api/v1/order/`,
        data: { 
          service_option: state.formdata.service_option,
          customer_name: state.formdata.customer_name,
          service_date: state.formdata.service_date,
          service_time: state.formdata.service_time,
          phonenum: state.formdata.phonenum,
          user_email: state.formdata.user_email,
          address: state.formdata.address,
          delivery_instructions: state.formdata.delivery_instructions,
          short_order: state.formdata.short_order,
          referral: state.formdata.referral,
          calendar_event_title: state.formdata.calendar_event_title,
          calendar_event_dates: state.formdata.calendar_event_dates,
          calendar_event_detail: state.formdata.calendar_event_detail,
          calendar_event_address: state.validated_delivery_address,
          confirmation_subject_escaped: state.formdata.confirmation_subject_escaped,
          confirmation_body_escaped: state.formdata.confirmation_body_escaped,
          special_instructions: state.formdata.special_instructions,
          additional_message: state.formdata.additional_message,
          load_time: state.formdata.load_time, 
          time_selection_time: state.formdata.time_selection_time,
          submittime: moment().format("MM-DD-YYYY HH:mm:ss"),
          useragent: navigator.userAgent,
          order_long: state.formdata.order_long,
          automated_instructions: state.formdata.automated_instructions,
          ispaid: state.isPaymentSuccess,
          payment_info: state.isPaymentSuccess === true ? state.payment_info : ""
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
    this.email_address = "";
    this.cart = {
      pizza: [],
      extras: []
    };
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
    this.additional_message = "";
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

    this.ServiceTimeChanged = function () {
      // time has changed so log the selection time and clear the timeout flag
      this.s.debug_info["time-selection-time"] = moment(timing_info.current_time);
      this.s.selected_time_timeout = false;
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
    };

    this.ValidateDeliveryAddress = function () {
      $rootScope.state.address_invalid = false;

      var onSuccess = function (response) {
        if (response.status === 200 && response.data.found) {
          $rootScope.state.validated_delivery_address = response.data.validated_address;
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
      this.s.additional_message = "";

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

      if (this.s.date_valid && !this.s.selected_date.isSame(timing_info.current_time, 'day')) {
        this.s.additional_message = "\nDOUBLE CHECK THIS IS FOR TODAY BEFORE SENDING THE TICKET\n";
      }

    };

    this.rebuildCartString = function () {
      var str_builder = "";
      var short_builder = "";
      var cart = [];
      var shortcart = [];

      // process cart for pizzas
      for (var i in this.s.cart.pizza) {
        var quantity = this.s.cart.pizza[i][0];
        var item = this.s.cart.pizza[i][1];
        cart.push(quantity + "x: " + item.name);
        shortcart.push(quantity + "x: " + item.shortname);
        str_builder = str_builder + quantity + "x: " + item.name + "\n";
        short_builder = short_builder + quantity + "x: " + item.shortname + "\n";
      }

      // process cart for extras
      for (var j in this.s.cart.extras) {
        var quantity = this.s.cart.extras[j][0];
        var item_name = this.s.cart.extras[j][1].name;
        cart.push(quantity + "x: " + item_name);
        shortcart.push(quantity + "x: " + item_name);
        str_builder = str_builder + quantity + "x: " + item_name + "\n";
        short_builder = short_builder + quantity + "x: " + item_name + "\n";
      }

      if (this.s.validated_delivery_address) {
        str_builder = str_builder + "\n Delivery Address: " + this.s.validated_delivery_address;
        cart.push("Delivery Address: " + this.s.validated_delivery_address);
      }

      this.s.cartstring = str_builder;
      this.s.shortcartstring = short_builder;
      this.s.shortcartlist = shortcart;
      this.s.cartlist = cart;
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

    this.computeDefaultTipIfClean = function() {
      if (this.s.tip_clean) {
        this.s.selectPercentageTip(this.s.selected_tip);
      }
      return true;
    }

    this.SlowSubmitterTrigger = function () {
      // set flag for user notification that too much time passed
      this.s.selected_time_timeout = true;
      // set stage to 4 (time selection)
      this.s.stage = 4;
    };

    this.SlowSubmitterCheck = function () {
      var old_time = this.s.service_time;
      this.ValidateDate();
      // only bump someone to the time selection page if they're already at least that far
      if (old_time != this.s.service_time && this.s.stage >= 4 && this.s.stage < 6) {
        this.SlowSubmitterTrigger();
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
    this.BAKE_MAX = wcpconfig.BAKE_MAX;
    this.selection = null;
    this.quantity = 1;
    this.toppings = toppings_array;
    this.sauces = sauces;
    this.cheese_options = cheese_options;
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
        if (this.selection.flavor_count[0] + addon_chz + addon_crust < 1 || this.selection.flavor_count[1] + addon_chz + addon_crust < 1) {
          this.messages.push("Hey, add something to this!");
        }
      }
    };

    this.updateSelection = function () {
      this.selection.UpdatePie();
      this.PopulateOrderGuide();
    };

    this.setPizza = function (selectedPizza) {
      this.selection = new WCPPizza(selectedPizza.name, selectedPizza.shortcode, selectedPizza.crust, selectedPizza.cheese_option, selectedPizza.sauce, selectedPizza.GenerateToppingsList());
      this.quantity = 1;
      this.PopulateOrderGuide();
    };

    this.unsetPizza = function () {
      this.selection = null;
      this.quantity = 1;
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


  app.directive("cf7bridge", ["OrderHelper", "$filter", "$interval", "$window", function (OrderHelper, $filter, $interval, $window) {
    return {
      restrict: "A",
      scope: {
        orderinfo: "=orderinfo",
      },
      link: function (scope, element, attrs) {
        // set load time field once
        var formatted_load_time = timing_info.load_time.format("H:mm:ss");
        scope.orderinfo.s.formdata.load_time = formatted_load_time;

        var EventTitleSetter = function () {
          var event_title = OrderHelper.EventTitleStringBuilder(scope.orderinfo.s.service_type, scope.orderinfo.s.customer_name, scope.orderinfo.s.cart, scope.orderinfo.s.special_instructions, scope.orderinfo.s.slice_pizzas);
          scope.orderinfo.s.formdata.calendar_event_title = event_title;
        };
        var EventDetailSetter = function () {
          var eventdetail = OrderHelper.EventDetailStringBuilder(scope.orderinfo.s.shortcartstring, scope.orderinfo.s.phone_number, scope.orderinfo.s.special_instructions);
          scope.orderinfo.s.formdata.calendar_event_detail = eventdetail;
        };
        var AutomatedInstructionsSetter = function () {
          var confirmation_body = OrderHelper.AutomatedInstructionsBuilder(scope.orderinfo.s.service_type, scope.orderinfo.s.selected_date, scope.orderinfo.s.service_time, scope.orderinfo.s.special_instructions, timing_info.order_placed_during_dining);
          scope.orderinfo.s.formdata.automated_instructions = confirmation_body;
        };
        var ConfirmationSubjectSetter = function () {
          var selected_date_string = scope.orderinfo.s.selected_date ? scope.orderinfo.s.selected_date.format("dddd, MMMM DD, Y") : "";
          scope.orderinfo.s.formdata.confirmation_subject_escaped = OrderHelper.EmailSubjectStringBuilder(scope.orderinfo.s.service_type, scope.orderinfo.s.customer_name, selected_date_string, scope.orderinfo.s.service_time);
        };
        var ConfirmationBodySetter = function () {
          var confirmation_body = OrderHelper.EmailBodyStringBuilder(scope.orderinfo.s.service_type, scope.orderinfo.s.selected_date, scope.orderinfo.s.service_time, scope.orderinfo.s.phone_number, scope.orderinfo.s.validated_delivery_address, scope.orderinfo.s.isPaymentSuccess);
          scope.orderinfo.s.formdata.confirmation_body_escaped = confirmation_body;
        };
        var EventDateSetter = function() {
          var eventdate = OrderHelper.EventDateTimeStringBuilder(scope.orderinfo.s.selected_date, scope.orderinfo.s.service_time, scope.orderinfo.s.service_type);
          scope.orderinfo.s.formdata.calendar_event_dates = eventdate
        }
        var AddressSetter = function() {
          var full_address_info = scope.orderinfo.s.validated_delivery_address;
          if (full_address_info && scope.orderinfo.s.delivery_address_2) {
            full_address_info = full_address_info + ", Unit Info: " + scope.orderinfo.s.delivery_address_2;
          }
          scope.orderinfo.s.formdata.address = full_address_info;
        }

        var ParseSpecialInstructionsAndPopulateResponses = function () {
          scope.orderinfo.s.special_instructions_responses = [];
          var special_instructions_lower = scope.orderinfo.s.special_instructions ? scope.orderinfo.s.special_instructions.toLowerCase() : "";
          if (special_instructions_lower.indexOf("split") >= 0 || special_instructions_lower.indexOf("half") >= 0 || special_instructions_lower.indexOf("1/2") >= 0) {
            scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_HALF);
          }
        };

        scope.$watch("orderinfo.s.debug_info", function () {
          var time_selection_time = scope.orderinfo.s.debug_info["time-selection-time"] ? scope.orderinfo.s.debug_info["time-selection-time"].format("H:mm:ss") : "";
          scope.orderinfo.s.formdata.time_selection_time = time_selection_time;
        }, true);

        scope.$watch("orderinfo.s.service_type", function () {
          var service_option = scope.orderinfo.CONFIG.SERVICE_TYPES[scope.orderinfo.s.service_type][0];
          scope.orderinfo.s.formdata.service_option = service_option;
          EventTitleSetter();
          EventDateSetter();
          ConfirmationSubjectSetter();
          ConfirmationBodySetter();
          AutomatedInstructionsSetter();
          scope.orderinfo.s.TotalsUpdate();
        }, true);
        scope.$watch("orderinfo.s.customer_name", function () {
          scope.orderinfo.s.formdata.customer_name = scope.orderinfo.s.customer_name;
          EventTitleSetter();
          ConfirmationSubjectSetter();
        }, true);
        scope.$watch("orderinfo.s.selected_date", function () {
          var selected_date_string = scope.orderinfo.s.selected_date ? scope.orderinfo.s.selected_date.format("dddd, MMMM DD, Y") : "";
          scope.orderinfo.s.formdata.service_date = selected_date_string;
          scope.orderinfo.s.formdata.additional_message = scope.orderinfo.s.additional_message;
          EventDateSetter();
          ConfirmationSubjectSetter();
          ConfirmationBodySetter();
          AutomatedInstructionsSetter();
        }, true);
        scope.$watch("orderinfo.s.service_time", function () {
          var service_time = $filter("MinutesToPrintTime")(scope.orderinfo.s.service_time, scope.orderinfo.s.service_type);
          scope.orderinfo.s.formdata.service_time = service_time;
          EventDateSetter();
          EventTitleSetter();
          ConfirmationSubjectSetter();
          ConfirmationBodySetter();
          AutomatedInstructionsSetter();
        }, true);
        scope.$watch("orderinfo.s.phone_number", function () {
          scope.orderinfo.s.formdata.phonenum = scope.orderinfo.s.phone_number;
          EventDetailSetter();
          ConfirmationBodySetter();
        }, true);
        scope.$watch("orderinfo.s.email_address", function () {
          scope.orderinfo.s.formdata.user_email = scope.orderinfo.s.email_address;
        }, true);
        scope.$watch("orderinfo.s.validated_delivery_address", function () {
          AddressSetter();
          ConfirmationBodySetter();
        }, true);
        scope.$watch("orderinfo.s.delivery_address_2", function () {
          AddressSetter();
        }, true);
        scope.$watch("orderinfo.s.delivery_instructions", function () {
          scope.orderinfo.s.formdata.delivery_instructions = scope.orderinfo.s.delivery_instructions;
        }, true);
        scope.$watch("orderinfo.s.referral", function () {
          scope.orderinfo.s.formdata.referral = scope.orderinfo.s.referral;
        }, true);
        scope.$watch("orderinfo.s.special_instructions", function () {
          ParseSpecialInstructionsAndPopulateResponses();
          var temp = scope.orderinfo.s.special_instructions.length > 0 ? "Special instructions: " + scope.orderinfo.s.special_instructions : "";
          scope.orderinfo.s.formdata.special_instructions = temp;
          EventTitleSetter();
          EventDetailSetter();
          AutomatedInstructionsSetter();
        }, true);
        scope.$watch("orderinfo.s.cartstring", function () {
          scope.orderinfo.s.formdata.short_order = scope.orderinfo.s.shortcartlist;
          scope.orderinfo.s.formdata.order_long = scope.orderinfo.s.cartlist;
          EventTitleSetter();
          EventDetailSetter();
        }, true);
        scope.$watch("orderinfo.s.isPaymentSuccess", function () {
          ConfirmationBodySetter();
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
          timing_info.order_placed_during_dining = OrderHelper.RelationshipToDineInHour(timing_info.current_time, OrderHelper.DateToMinutes(timing_info.current_time));
          UpdateLeadTime();
          scope.orderinfo.SlowSubmitterCheck();
          AutomatedInstructionsSetter();
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
  
  app.controller('PaymentController', ['$scope', '$rootScope', '$http', 'OrderHelper', function($scope, $rootScope, $http, OrderHelper) {
    //for showing #successNotification div
    $scope.isBuilt = false;

    $scope.submitForm = function() {
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
        cardNonceResponseReceived: function(errors, nonce, cardData) {
          if (errors){
            $scope.card_errors = errors
            $rootScope.state.isProcessing = false;
            $scope.$apply();
            $rootScope.$apply();
          }else{
            $scope.card_errors = []
            $scope.chargeCardWithNonce(nonce);
          }
          
        },
        unsupportedBrowserDetected: function() {
          alert("Unfortunately, your browser or settings don't allow for pre-payment. Please go back and select that you'd like to pay later or try your order on a newer browser.");
        }
      }
    });

    $scope.chargeCardWithNonce = function(nonce) {
      var data = {
        nonce: nonce,
        amount_money: $rootScope.state.total - $rootScope.state.tip_value,
        tip_money: $rootScope.state.tip_value,
        email_title: decodeURIComponent($rootScope.state.formdata.confirmation_subject_escaped)
      };
      $http.post(`${WARIO_ENDPOINT}api/v1/payments/payment`, data).success(function(data, status) {
        if (status == 200) {
          $rootScope.state.isPaymentSuccess = true;
          $rootScope.state.formdata.confirmation_body_escaped = OrderHelper.EmailBodyStringBuilder($rootScope.state.service_type, $rootScope.state.selected_date, $rootScope.state.service_time, $rootScope.state.phone_number, $rootScope.state.validated_delivery_address, $rootScope.state.isPaymentSuccess);
          $rootScope.state.payment_info = data;
          $rootScope.state.SubmitToWarioInternal($http, $rootScope.state);
        }
        else {
          // display server side card processing errors 
          $rootScope.state.isPaymentSuccess = false;
          $scope.card_errors = []
          var errors = JSON.parse(data.result);
          for (var i =0; i < errors.length; i++){
            $scope.card_errors.push({message: errors[i].detail})
          }
        } 
        $rootScope.state.isProcessing = false;
      }).error(function(data){
        $rootScope.state.isPaymentSuccess = false;
        $rootScope.state.isProcessing = false;
        if (data && data.result) {
          $scope.card_errors = [];
          var errors = JSON.parse(data.result).errors;
          for (var i =0; i < errors.length; i++){
            $scope.card_errors.push({message: errors[i].detail})
          }
        } else {
          $scope.card_errors = [{message: "Processing error, please try again! If you continue to have issues, text us."}];
        }
      });
    }

    $scope.buildForm = function() {
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
