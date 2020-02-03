// TODO: handle leaving page before submitting (onbeforeunload)
  // TODO: guided menu help/suggestions (advanced, suggest meatza + giard, etc)
  // TODO: tooltip explanations of disabled items
  // TODO: half toppings UI
  // TODO: notice about cancellation
  // TODO: intercept back/forward button
  // TODO: add privacy notice
  // TODO: multiple of same pizza menu guide
  var $j = jQuery.noConflict();

  var EMAIL_REGEX = new RegExp("^[_A-Za-z0-9-]+(\\.[_A-Za-z0-9-]+)*@[A-Za-z0-9]+(\\.[A-Za-z0-9]+)*(\\.[A-Za-z]{2,})$");

  var DATE_STRING_INTERNAL_FORMAT = "YYYYMMDDZZ";

  function ScrollTopJQ() {
    $j("html, body").animate({
        scrollTop: $j("#ordertop").offset().top - 150
    }, 500);
  }

  var TimingInfo = function() {
    this.load_time = moment(new Date([WCP_blog_epoch_time]));
    this.current_time = this.load_time;
    this.browser_load_time = moment();
    this.load_time_diff = 0;
    this.order_placed_during_dining = false;
  };

  var timing_info = new TimingInfo();

  var WCPStoreConfig = function() {
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

    this.BLOCKED_OFF = [WCP_time_off];

    this.PICKUP_HOURS = [
      [12*60, 22*60], //sunday
      [1*60, 0*60], //monday
      [1*60, 0*60], //tuesday
      [16*60, 22*60], //wednesday
      [16*60, 22*60], //thursday
      [16*60, 23*60], //friday
      [12*60, 23*60]  //saturday
    ];

    this.DINEIN_HOURS = [
      [12*60, 21.5*60], //sunday
      [1*60, 0*60], //monday
      [1*60, 0*60], //tuesday
      [16*60, 21.5*60], //wednesday
      [16*60, 21.5*60], //thursday
      [16*60, 22.5*60], //friday
      [12*60, 22.5*60]  //saturday
    ];

    this.DELIVERY_HOURS = [
      [11*60, 22*60], //sunday
      [11*60, 22*60], //monday
      [11*60, 22*60], //tuesday
      [11*60, 22*60], //wednesday
      [11*60, 22*60], //thursday
      [11*60, 22*60], //friday
      [11*60, 22*60]  //saturday
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
    this.EXTRAS_MENU = salad_menu;
    this.PIZZA_MENU = pizza_menu;
    this.TOPPINGS  = toppings_array;
    this.SAUCES = sauces;
    this.CHEESE_OPTIONS = cheese_options;
    this.CRUSTS = crusts;
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
      "872": true
    };
    this.NOTE_SPECIAL_INSTRUCTIONS = "Since you specified special instructions, we will let you know if we can accommodate your request. We may need your confirmation if your instructions will incur an additional cost or we cannot accommodate them, so please watch your email.";
    this.NOTE_KEEP_LEVEL = "Be sure to travel with your pizza as flat as possible, on the floor or in the trunk. Seats are generally not a level surface.";
    this.NOTE_PICKUP_BEFORE_DI = "We won't be open for dine-in at the time of your pickup. Our door may be locked. Please text 206.486.4743 or respond to this email thread when you've arrived. Please let us know if you have any additional questions about the pickup process.";
    this.NOTE_PICKUP_DURING_DI = "Come to the host stand and let us know your first name and that you have a pre-order.";
    this.NOTE_PICKUP_AFTER_DI = "We'll be ending our dine-in service at the time of your pickup. Please come to the bar and inform us the name under which the order was placed.";
    this.NOTE_DI = "Dine-ins get you to the front of the table queue. We don't reserve seating. Please arrive slightly before your selected time so your pizza is as fresh as possible and you have time to get situated and get beverages! ";
    this.NOTE_DELIVERY_BETA = "Our catering offering is current in a limited beta. We'll reach out shortly to determine our availability for the requested time and to get a better idea of your needs.";
    this.NOTE_PAYMENT = "We happily accept any major credit card or cash for payment upon arrival.";

    this.REQUEST_SLICING = "In order to ensure the quality of our pizzas, we will not slice them. We'd recommend bringing anything from a bench scraper to a butter knife to slice the pizza. Slicing the whole pizza when it's hot inhibits the crust from properly setting, and can cause the crust to get soggy both during transit and as the pie is eaten. We want your pizza to be the best possible and bringing a tool with which to slice the pie will make a big difference.";
    this.REQUEST_VEGAN = "Our pizzas cannot be made vegan or without cheese. If you're looking for a vegan option, our Beets By Schrute salad can be made vegan by omitting the bleu cheese.";
    this.REQUEST_HALF = "While half toppings are not on the menu, we can do them (with the exception of half roasted garlic or half red sauce, half white sauce) but they are charged the same as full toppings. As such, we recommend against them as they're not a good value for the customer and an imbalance of toppings will cause uneven baking of your pizza.";
    // END user messaging

    this.UpdateBlockedOffVal = function(bo) {
      this.BLOCKED_OFF = bo;
    }

    this.UpdateLeadTimeVal = function(lt) {
      this.LEAD_TIME = lt;
    }
    //END WCP store config
  };

  var wcpconfig = new WCPStoreConfig();

  function FixOldBlockedOff() {
    for (var i in wcpconfig.BLOCKED_OFF) {
      for (var j in wcpconfig.BLOCKED_OFF[i]) {
          if(typeof wcpconfig.BLOCKED_OFF[i][j][0] != "String") {
            wcpconfig.BLOCKED_OFF[i][j][0] = moment(wcpconfig.BLOCKED_OFF[i][j][0]).format(DATE_STRING_INTERNAL_FORMAT);
          }
      }
    }
  }
  FixOldBlockedOff();

  var WCPOrderHelper = function() {
    // HELPER FUNCTIONS
    this.cfg = wcpconfig;

    this.IsFirstDatePreviousDayToSecond = function(first, second) {
      //takes moments
      return first.isBefore(second, 'day');
    };

    this.IsPreviousDay = function(date) {
      // dateis a moment
      return this.IsFirstDatePreviousDayToSecond(date, timing_info.current_time);
    };

    this.MinutesToHMS = function(time) {
      var hour = Math.floor(time / 60);
      var minute = time - (hour * 60);
      return String(hour) + (minute < 10 ? "0" : "") + String(minute) + "00";
    };

    this.DateToMinutes = function(date) {
      // passed date is a moment
      return date.hours() * 60 + date.minutes();
    };

    this.MinutesToPrintTime = function(minutes) {
      if(isNaN(minutes) || minutes < 0) {
        return minutes;
      }
      var hour = Math.floor(minutes / 60);
      var minute = minutes - (hour * 60);
      var meridian = hour >= 12 ? "PM" : "AM";
      var printHour = (hour % 12 === 0 ? 12 : hour % 12).toString();
      var printMinute = (minute < 10 ? "0" : "").concat(minute.toString());
      return printHour.concat(":").concat(printMinute + meridian);
    };

    this.IsIllinoisAreaCode = function(phone) {
      var numeric_phone = phone.match(/\d/g);
      numeric_phone = numeric_phone.join("");
      return (numeric_phone.length == 10 && (numeric_phone.slice(0,3)) in this.cfg.AREA_CODES);
    };

    this.GetBlockedOffForDate = function(date, service) {
    // date is passed as DATE_STRING_INTERNAL_FORMAT
      for (var i in this.cfg.BLOCKED_OFF[service]) {
        if (this.cfg.BLOCKED_OFF[service][i][0] === date) {
          return this.cfg.BLOCKED_OFF[service][i][1];
        }
      }
      return [];
    };

    this.HandleBlockedOffTime = function(blockedOff, time) {
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

    this.GetServiceIntervalsForDate = function(date, service) {
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
        }
        else {
          interval[1] = next_time;
        }
        earliest = next_time;
      }
      return intervals;
    }

    this.GetFirstAvailableTime = function(date, service, size, cart_based_lead_time) {
      // param date: the date we're looking for the earliest time, as a moment
      // param service: the service type enum
      // param size: the order size
      // param cart_based_lead_time: any minimum preorder times associated with the specific items in the cart
      const internal_formatted_date = date.format(DATE_STRING_INTERNAL_FORMAT);
      var blocked_off = this.GetBlockedOffForDate(internal_formatted_date, service);
      var minmax = this.cfg.HOURS_BY_SERVICE_TYPE[service][date.day()];
      // cart_based_lead_time and service/size lead time don't stack
      var leadtime = Math.max(this.cfg.LEAD_TIME[service] + ((size-1) * this.cfg.ADDITIONAL_PIE_LEAD_TIME), cart_based_lead_time);

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

    this.DisableExhaustedDates = function(date, service, size, cart_based_lead_time) {
      // checks if orders can still be placed for the
      // given date (moment), service type, and order size
      // param cart_based_lead_time: any minimum preorder times associated with the specific items in the cart
      // return: true if orders can still be placed, false otherwise
      var maxtime = this.cfg.HOURS_BY_SERVICE_TYPE[service][date.day()][1];
      return this.GetFirstAvailableTime(date, service, size, cart_based_lead_time) <= maxtime;
    };

    this.DisableFarOutDates = function(date) {
      // disables dates more than a year out from the current date
      const load_time_plus_year = moment(timing_info.current_time).add(1, 'y');
      return date.isBefore(load_time_plus_year, 'day');
    };

    this.IsDateActive = function(date, service, size, cart_based_lead_time) {
      // date is a moment
      return !this.IsPreviousDay(date) && this.DisableExhaustedDates(date, service, size, cart_based_lead_time) && this.DisableFarOutDates(date);
    };

    this.GetStartTimes = function(userDate, service, size, cart_based_lead_time) {
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

    this.RelationshipToDineInHour = function(date, time) {
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
      return service_intervals.length && service_intervals[service_intervals.length-1][1] < time ? 2 : 0;
    };

    this.AutomatedInstructionsBuilder = function(service_type, date, time, special_instructions, placed_during_dinein) {
      // date is a moment
      if (!date || !date.isValid() || isNaN(time)) {
        return "";
      }
      var has_special_instructions = special_instructions && special_instructions.length > 0;

      var response_time = placed_during_dinein ? "shortly" : "as soon as we're able";
      var special_instructions_note = has_special_instructions ? " " + this.cfg.NOTE_SPECIAL_INSTRUCTIONS : "";
      var non_delivery_preamble = "We'll get back to you " + response_time + " to confirm your order.";// + special_instructions_note;

      switch (service_type) {
        case this.cfg.DELIVERY: return this.cfg.NOTE_DELIVERY_BETA;
        case this.cfg.PICKUP:
          return non_delivery_preamble + "\n";// + (service_during_dine_in ? this.cfg.NOTE_PICKUP_DURING_DI : this.cfg.NOTE_PICKUP_BEFORE_DI) + "\n" + this.cfg.NOTE_PAYMENT;
        case this.cfg.DINEIN:
          return non_delivery_preamble + "\n";// + this.cfg.NOTE_DI + "\n" + this.cfg.NOTE_PAYMENT;
        default: console.assert(false, "invalid service value");
      }
    };

    this.EmailSubjectStringBuilder = function(service_type, name, date_string, service_time) {
      if (!name || name.length === 0 || !date_string || date_string.length === 0) {
        return "";
      }
      service_type = this.cfg.SERVICE_TYPES[service_type][0];
      service_time = this.MinutesToPrintTime(service_time);
      //[service-option] for [user-name] on [service-date] - [service-time]
      return encodeURI(service_type + " for " + name + " on " + date_string + " - " + service_time);
    };

    this.EmailBodyStringBuilder = function(service_type, date, time, phone) {
      if (date === null || isNaN(time)) {
        return "";
      }

      var service_during_dine_in = this.RelationshipToDineInHour(date, time);
      var service_time_print = this.MinutesToPrintTime(time);
      var nice_area_code = this.IsIllinoisAreaCode(phone);
      var confirm_string_array = [];
      switch (service_type) {
        case this.cfg.DELIVERY: confirm_string_array = ["NOT SUPPORTED"]; break;
        case this.cfg.PICKUP:
        if (service_during_dine_in === 0) {
          var opener = nice_area_code ? "Hello, nice area code, and thanks for your order! " : "Hello and thanks for your order! ";
          confirm_string_array = [
            opener,
            "We're happy to confirm your pickup for ",
            service_time_print,
            ".\n\n",
            this.cfg.NOTE_PICKUP_BEFORE_DI,
            " ",
            this.cfg.NOTE_PAYMENT
          ];
        }
        else {
          var opener = nice_area_code ? "Nice area code! " : "";
          confirm_string_array = [
            opener,
            "We're happy to confirm your pickup order for ",
            service_time_print,
          " at our Phinney Ridge home (5918 Phinney Ave N, 98103).\n\n",
            service_during_dine_in === 1 ? this.cfg.NOTE_PICKUP_DURING_DI : this.cfg.NOTE_PICKUP_AFTER_DI,
            this.cfg.NOTE_PAYMENT
          ];
        }
        break;
      case this.cfg.DINEIN:
        var opener = nice_area_code ? "Nice area code! " : "";
        confirm_string_array = [
          opener,
          "We're happy to confirm your order for ",
          service_time_print,
          " at our Phinney Ridge home (5918 Phinney Ave N, 98103).\n\n",
          this.cfg.NOTE_DI,
          this.cfg.NOTE_PAYMENT
        ];
        break;
        default: console.assert(false, "invalid service value"); break;
      }
      return encodeURI(confirm_string_array.join(""));
    };

    this.EventTitleStringBuilder = function(service, customer, cart, special_instructions) {
      if (!customer || cart.pizza.length === 0) {
        return "";
      }
      customer = customer.replace(/\s/g, "+").replace(/[&]/g, "and");
      var service_string = "";
      if (service == this.cfg.PICKUP) {
        service_string = "P";
      }
      else if (service == this.cfg.DINEIN) {
        service_string = "DINE";
      }
      else if (service == this.cfg.DELIVERY) {
        service_string = "DELIVER";
      }

      var has_special_instructions = special_instructions && special_instructions.length > 0;

      var num_pizzas = 0;
      var pizza_shortcodes = "";
      for (var i in cart.pizza) {
        var quantity = cart.pizza[i][0];
        var shortcode = cart.pizza[i][1].shortcode;
        num_pizzas = num_pizzas + quantity;
        pizza_shortcodes = pizza_shortcodes + Array(quantity+1).join("+" + shortcode);
      }
      var extras_shortcodes = "";
      for (var j in cart.extras) {
        var quantity = cart.extras[j][0];
        var shortcode = cart.extras[j][1].shortcode;
        extras_shortcodes = extras_shortcodes + "+" + quantity.toString(10) + "x" + shortcode;
      }
      var customer_encoded = encodeURI(customer);
      var pizzas_title = num_pizzas + "x" + pizza_shortcodes;
      var extras_title = extras_shortcodes.length > 0 ? "+Extras"+extras_shortcodes : "";
      return service_string + "+" + customer_encoded + "+" + pizzas_title + extras_title + (has_special_instructions ? "+%2A" : "");
    };

    this.EventDateTimeStringBuilder = function(date, time) {
      if(!date || !date.isValid() || isNaN(time) || time < 0) {
        return "";
      }
      var dateString = String(date.year()) + (date.month() < 9 ? "0" : "") + String(date.month()+1) + (date.date() < 10 ? "0" : "") + String(date.date()) + "T";
      var timeString;
      time = String(time).split(",");
      if (time.length == 1) {
        var ts = this.MinutesToHMS(time[0]);
        timeString = [ts, ts];
      }
      else {
        timeString = [this.MinutesToHMS(parseInt(time[0])), this.MinutesToHMS(parseInt(time[1]))];
      }
      return dateString + timeString[0] + "/" + dateString + timeString[1];
    };

    this.EventDetailStringBuilder = function(order, phone, special_instructions) {
      if (!order || !phone) {
        return "";
      }
      var es = encodeURI(order.replace(/[&]/g, "and")).replace(/[\n\f]/gm, "%0A").replace(/\+/g, "%2B").replace(/\s/g, "+") + "%0Aph:+" + phone.replace(/\D/g, "");
      if (special_instructions.length > 0) {
        es = es + encodeURI(("\n" + special_instructions).replace(/[&]/g, "and")).replace(/[\n\f]/gm, "%0A").replace(/\s/g, "+");
      }
      return es;
    };

  };

  var wcporderhelper = new WCPOrderHelper();

  var FixQuantity = function(val, clear_if_invalid) {
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
      $j("span.leadtime").html("Next available same-day order: " + wcporderhelper.MinutesToPrintTime(first));
    }
    else {
      $j("span.leadtime").html("");
    }
  }

  (function() {

    var app = angular.module("WCPOrder", ['btford.socket-io']);

    app.filter("MinutesToPrintTime", function() {
      return wcporderhelper.MinutesToPrintTime;
    });

    app.factory('socket', function ($rootScope) {
      var socket = io.connect("https://wario.windycitypie.com/nsRO");
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

    var WCPOrderState = function(cfg, enable_delivery, enable_split_toppings) {

      this.RecomputeOrderSize = function() {
        var size = 0;
        for (var i in this.cart.pizza) {
          size = size + this.cart.pizza[i][0];
        }
        this.num_pizza = size;
      };

      this.ComputeCartBasedLeadTime = function() {
        this.cart_based_lead_time = 0;
        for (var i in this.cart.pizza) {
          this.cart_based_lead_time = Math.max(this.cart_based_lead_time, this.cart.pizza[i][1].crust.leadtime);
        }
      };

      this.date_string = ""; // friendly version of the date, for the UI
      this.date_valid = false;
      this.service_times = ["Please select a valid date"];
      this.debug_info = {};

      this.service_type = cfg.PICKUP;
      this.selected_date = ""; // the moment object of the selected date
      this.service_time = "Please select a valid date";
      this.customer_name = "";
      this.phone_number = "";
      this.delivery_address = "";
      this.delivery_zipcode = "";
      this.email_address = "";
      this.cart = {pizza: [], extras:[]};
      this.cartstring = "";
      this.num_pizza = 0;
      this.cart_based_lead_time = 0;
      this.shortcartstring = "";
      this.referral = "";
      this.acknowledge_instructions_dialogue = false;
      this.special_instructions = "";
      this.special_instructions_responses = [];
      this.additional_message = "";
      this.enable_split_toppings = false;
      this.enable_delivery = enable_delivery;
      this.delivery_fee = 0;
      this.EMAIL_REGEX = EMAIL_REGEX;

      this.service_type_functors = [
        // PICKUP
        function (state) { return true; },
        // DINEIN
        function (state) { return true; },
        // DELIVERY
        function (state) { return state.enable_delivery && state.num_pizza >= 5; }
      ];

      // stage 0: menu/cart controller: cart display // pie selection // customize pie, add to cart
      // stage 1: salads
      // stage 2: customer name, phone, email address, address , referral info
      // stage 3: select service_type date/time
      // stage 4: review order, special instructions
      // stage 5: pressed submit, waiting validation
      // stage 6: submitted successfully
      this.stage = 0;

      // flag for when submitting fails according to submission backend
      this.submit_failed = false;

      // flag for when too much time passes and the user's time needs to be re-selected
      this.selected_time_timeout = false;
    };

    app.controller("OrderController", ["OrderHelper", "$filter", "$location", "socket", function(OrderHelper, $filter, $location, $socket) {
      this.ORDER_HELPER = OrderHelper;
      this.CONFIG = wcpconfig;
      this.toppings = toppings_array;
      this.sauces = sauces;
      this.cheese_options = cheese_options;
      this.crusts = crusts;
      this.split_toppings = $location.search().split === true;

      var enable_delivery = $location.search().delivery === true;

      this.ScrollTop = ScrollTopJQ;

      this.s = new WCPOrderState(this.CONFIG, enable_delivery, this.split_toppings);

      this.Reset = function() {
        this.s = new WCPOrderState(this.CONFIG, enable_delivery, this.split_toppings);
      };

      this.ServiceTimeChanged = function() {
        // time has changed so log the selection time and clear the timeout flag
        this.s.debug_info["time-selection-time"] = moment(timing_info.current_time);
        this.s.selected_time_timeout = false;
      };

      this.ClearAddress = function() {
        this.s.delivery_zipcode = "";
        this.s.delivery_address = "";
      };

      this.ClearSpecialInstructions = function() {
        this.s.special_instructions = "";
      };

      this.ComputeDeliveryFee = function() {
        this.s.delivery_fee = this.s.delivery_zipcode && this.s.delivery_zipcode.length > 0 ? 30 : 0;
      };

      this.ValidateDate = function() {
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
        }
        else {
          // grab the old service_time the date was valid then one must have been selected
          var old_service_time = this.s.date_valid ? this.s.service_time : null;

          this.s.selected_date = moment(parsedDate);
          this.s.date_string = this.s.selected_date.format("dddd, MMMM DD, Y");
          this.s.date_valid = true;

          this.s.service_times = OrderHelper.GetStartTimes(this.s.selected_date, this.s.service_type, this.s.num_pizza, this.s.cart_based_lead_time);

          // don't use findindex here because of IE(all)
          if (!old_service_time || !this.s.service_times.some(function(elt, idx, arr) { return elt == old_service_time; })) {
              this.s.service_time = this.s.service_times[0];
              this.ServiceTimeChanged();
          }
        }

        if (this.s.date_valid && !this.s.selected_date.isSame(timing_info.current_time, 'day')) {
          this.s.additional_message = "\nDOUBLE CHECK THIS IS FOR TODAY BEFORE MAKING THE BOX\n";
        }

      };

      this.rebuildCartString = function() {
        var str_builder = "";
        var short_builder = "";

        // process cart for pizzas
        for (var i in this.s.cart.pizza) {
          var quantity = this.s.cart.pizza[i][0];
          var item = this.s.cart.pizza[i][1];
          str_builder = str_builder + quantity + "x: " + item.name + "\n";
          short_builder = short_builder + quantity + "x: " + item.shortname + "\n";
        }

        // process cart for extras
        for (var j in this.s.cart.extras) {
          var quantity = this.s.cart.extras[j][0];
          var item_name = this.s.cart.extras[j][1].name;
          str_builder = str_builder + quantity + "x: " + item_name + "\n";
          short_builder = short_builder + quantity + "x: " + item_name + "\n";
        }

        this.s.cartstring = str_builder;
        this.s.shortcartstring = short_builder;
      };

      this.PostCartUpdate = function() {
        this.s.RecomputeOrderSize();
        this.s.ComputeCartBasedLeadTime();
        this.ValidateDate();
      };

      this.ChangedContactInfo = function() {
        this.s.customer_name = this.s.customer_name.replace(/[\+\t\r\n\v\f]/g, '');
        // resets the submit failed flag as the contact info has changed
        this.s.submit_failed = false;
      };

      this.addPizzaToOrder = function(quantity, selection) {
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

      this.removePizzaFromOrder = function(idx) {
        this.s.cart.pizza.splice(idx, 1);
        this.PostCartUpdate();
      };

      this.addExtraToOrder = function(selection) {
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

      this.removeExtraFromOrder = function(idx) {
        this.s.cart.extras.splice(idx, 1);
        this.PostCartUpdate();
      };

      this.subtotal = function() {
        var val = 0;
        for (var i in this.s.cart.pizza) {
          val += this.s.cart.pizza[i][0] * this.s.cart.pizza[i][1].price;
        }
        for (var j in this.s.cart.extras) {
          val += this.s.cart.extras[j][0] * this.s.cart.extras[j][1].price;
        }
        return val;
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

      this.Submit = function() {
        this.s.stage = 5;
      };

      this.CF7SubmitFailed = function() {
        this.s.submit_failed = true;
        this.s.stage = 2;
      };

      this.CF7SubmitSuccess = function() {
        this.s.stage = 6;
      };

      this.SlowSubmitterTrigger = function() {
        // set flag for user notification that too much time passed
        this.s.selected_time_timeout = true;
        // set stage to 3 (time selection)
        this.s.stage = 3;
      };

      this.SlowSubmitterCheck = function() {
        var old_time = this.s.service_time;
        this.ValidateDate();
        // only bump someone to the time selection page if they're already at least that far
        if (old_time != this.s.service_time && this.s.stage >= 2) {
          this.SlowSubmitterTrigger();
        }
      };
      this.NextStage = function() {
        this.s.stage = this.s.stage + 1;
        this.s.selected_time_timeout = false;
      };
      this.PreviousStage = function() {
        this.s.stage = this.s.stage - 1;
      };
      this.HasPreviousStage = function() {
        return this.s.stage > 0 && this.s.stage <= 4;
      };
      this.HasNextStage = function() {
        return this.s.stage < 4;
      };

      // this binding means we need to have this block here.
      var UpdateBlockedOffFxn = function(message) {
        this.CONFIG.UpdateBlockedOffVal(message);
        this.SlowSubmitterCheck();
        UpdateLeadTime();
      };
      var UpdateBlockedOffFxn = UpdateBlockedOffFxn.bind(this);
      $socket.on("WCP_BLOCKED_OFF", UpdateBlockedOffFxn);
      const UpdateLeadTimeFxn = function(message) {
        this.CONFIG.UpdateLeadTimeVal(message);
        this.SlowSubmitterCheck();
        UpdateLeadTime();
      };
      const BoundUpdateLeadTimeFxn = UpdateLeadTimeFxn.bind(this);
      $socket.on("WCP_LEAD_TIMES", BoundUpdateLeadTimeFxn);

    }]);

    app.controller("PizzaMenuController", function() {
      this.pizza_menu = wcpconfig.PIZZA_MENU;
      this.extras_menu = wcpconfig.EXTRAS_MENU;
      this.selection = null;
      this.quantity = 1;
      this.toppings = toppings_array;
      this.sauces = sauces;
      this.cheese_options = cheese_options;
      this.crusts = crusts;
      this.messages = [];
      this.suppress_guide = false;

      this.PopulateOrderGuide = function() {
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

      this.updateSelection = function() {
        this.selection.UpdatePie();
        this.PopulateOrderGuide();
      };

      this.setPizza = function(selectedPizza) {
        this.selection = new WCPPizza(selectedPizza.name, selectedPizza.shortcode, selectedPizza.crust, selectedPizza.cheese_option, selectedPizza.sauce, selectedPizza.GenerateToppingsList());
        this.quantity = 1;
        this.PopulateOrderGuide();
      };

      this.unsetPizza = function() {
        this.selection = null;
        this.quantity = 1;
      };

      this.fixQuantity = function() {
        this.quantity = FixQuantity(this.quantity, true);
      };
    });

    app.directive("wcppizzacartitem", function() {
      return {
        restrict: "E",
        scope: {
          pizza: "=pizza",
          dots: "=dots",
          price: "=price",
          description: "=description"
        },
        controller: function () {
        },
        controllerAs: "ctrl",
        bindToController: true,
        template:
        '<h4 class="menu-list__item-title"><span class="item_title">{{ctrl.pizza.name}}</span><span ng-if="ctrl.dots" class="dots"></span></h4>'+
        '<p ng-repeat="topping_section in ctrl.pizza.toppings_sections" class="menu-list__item-desc">'+
          '<span ng-if="ctrl.description && !ctrl.pizza.is_byo" class="desc__content">'+
            '<span ng-if="ctrl.pizza.is_split"><strong>{{topping_section[0]}}: </strong></span>'+
            '<span>{{topping_section[1]}}</span>'+
          '</span>'+
        '</p>'+
        '<span ng-if="ctrl.dots" class="dots"></span>'+
        '<span ng-if="ctrl.price" class="menu-list__item-price">{{ctrl.pizza.price}}</span>',
      };
    });

    app.directive("wcptoppingdir", function() {
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
          this.UpdateTopping = function() {
            this.selection.toppings_tracker[this.topping.index] = (+this.right)*2 + (+this.left) + (+this.whole)*3;
            this.pmenuctrl.updateSelection();
            this.selection.UpdatePie();
          };
          this.ToggleWhole = function() {
            this.left = this.right = false;
            this.UpdateTopping();
          };
          this.ToggleHalf = function() {
            if (this.left && this.right) {
              this.whole = true;
              this.left = this.right = false;
            }
            else {
              this.whole = false;
            }
            this.UpdateTopping();
          };

          this.Initalize();
        },
        controllerAs: 'ctrl',
        bindToController: true,
        template:
        '<input id="{{ctrl.topping.shortname}}_whole" class="input-whole" ng-model="ctrl.whole" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.WHOLE)" type="checkbox" ng-change="ctrl.ToggleWhole()">'+
        '<input ng-show="ctrl.split" id="{{ctrl.topping.shortname}}_left" class="input-left"  ng-model="ctrl.left" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.LEFT)" type="checkbox" ng-change="ctrl.ToggleHalf()">'+
        '<input ng-show="ctrl.split" id="{{ctrl.topping.shortname}}_right" class="input-right" ng-model="ctrl.right" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.RIGHT)" type="checkbox" ng-change="ctrl.ToggleHalf()">'+
          '<span class="option-circle-container">'+
            '<label for="{{ctrl.topping.shortname}}_whole" class="option-whole option-circle"></label>'+
            '<label ng-show="ctrl.split" for="{{ctrl.topping.shortname}}_left" class="option-left option-circle"></label>'+
            '<label ng-show="ctrl.split" for="{{ctrl.topping.shortname}}_right" class="option-right option-circle"></label>'+
          '</span>'+
        '<label class="topping_text" for="{{ctrl.topping.shortname}}_whole" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.WHOLE)">{{ctrl.topping.name}}</label>'
      };
    });


    app.directive("cf7bridge", ["OrderHelper", "$filter", "$interval", "$window", function(OrderHelper, $filter, $interval, $window) {
      return {
        restrict: "A",
        scope: {
          orderinfo: "=orderinfo",
        },
        link: function(scope, element, attrs) {
          // add event handler for invalid/spam/mailsent/mailfailed/submit
          $j(element).on("wpcf7mailfailed", function(){
            scope.orderinfo.CF7SubmitFailed();
            scope.$apply();
          });
          $j(element).on("wpcf7mailsent", function(){
            scope.orderinfo.CF7SubmitSuccess();
            scope.$apply();
          });

          // set load time field once
          $j(element).find("span.load-time input").val(timing_info.load_time.format("H:mm:ss"));

          var EventTitleSetter = function() {
            var event_title = OrderHelper.EventTitleStringBuilder(scope.orderinfo.s.service_type, scope.orderinfo.s.customer_name, scope.orderinfo.s.cart, scope.orderinfo.s.special_instructions);
            $j(element).find("span.eventtitle input").val(event_title);
          };
          var EventDetailSetter = function() {
            var eventdetail = OrderHelper.EventDetailStringBuilder(scope.orderinfo.s.shortcartstring, scope.orderinfo.s.phone_number, scope.orderinfo.s.special_instructions);
            $j(element).find("span.eventdetail textarea").val(eventdetail);
          };
          var AutomatedInstructionsSetter = function() {
            var confirmation_body = OrderHelper.AutomatedInstructionsBuilder(scope.orderinfo.s.service_type, scope.orderinfo.s.selected_date, scope.orderinfo.s.service_time, scope.orderinfo.s.special_instructions, timing_info.order_placed_during_dining);
            $j(element).find("span.automated_instructions textarea").val(confirmation_body);
          };
          var ConfirmationSubjectSetter = function() {
            var selected_date_string = scope.orderinfo.s.selected_date ? scope.orderinfo.s.selected_date.format("dddd, MMMM DD, Y") : "";
            var confirmation_subject = OrderHelper.EmailSubjectStringBuilder(scope.orderinfo.s.service_type, scope.orderinfo.s.customer_name, selected_date_string, scope.orderinfo.s.service_time);
            $j(element).find("span.confirmation-subject textarea").val(confirmation_subject);
          };
          var ConfirmationBodySetter = function() {
            var confirmation_body = OrderHelper.EmailBodyStringBuilder(scope.orderinfo.s.service_type, scope.orderinfo.s.selected_date, scope.orderinfo.s.service_time, scope.orderinfo.s.phone_number);
            $j(element).find("span.confirmation-body textarea").val(confirmation_body);
          };

          var ParseSpecialInstructionsAndPopulateResponses = function() {
            scope.orderinfo.s.special_instructions_responses = [];
            var special_instructions_lower = scope.orderinfo.s.special_instructions ? scope.orderinfo.s.special_instructions.toLowerCase() : "";
            if (wcpconfig.REQUEST_HALF && special_instructions_lower.indexOf("split") >= 0 || special_instructions_lower.indexOf("half") >= 0 || special_instructions_lower.indexOf("1/2") >= 0) {
              scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_HALF);

            }
            if (wcpconfig.REQUEST_SLICING && special_instructions_lower.indexOf("slice") >= 0 || special_instructions_lower.indexOf("cut") >= 0) {
              scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_SLICING);
            }
            if (wcpconfig.REQUEST_VEGAN && special_instructions_lower.indexOf("no cheese") >= 0 || special_instructions_lower.indexOf("vegan") >= 0 || special_instructions_lower.indexOf("without cheese") >= 0) {
              scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_VEGAN);
            }
          };

          scope.$watch("orderinfo.s.debug_info", function() {
            $j(element).find("span.time-selection-time input").val(scope.orderinfo.s.debug_info["time-selection-time"] ? scope.orderinfo.s.debug_info["time-selection-time"].format("H:mm:ss"):"");
          }, true);

          scope.$watch("orderinfo.s.service_type", function() {
            $j(element).find("span.service-option input").val(scope.orderinfo.CONFIG.SERVICE_TYPES[scope.orderinfo.s.service_type][0]);
            EventTitleSetter();
            ConfirmationSubjectSetter();
            ConfirmationBodySetter();
            AutomatedInstructionsSetter();
          }, true);
          scope.$watch("orderinfo.s.customer_name", function() {
            $j(element).find("span.user-name input").val(scope.orderinfo.s.customer_name);
            EventTitleSetter();
            ConfirmationSubjectSetter();
          }, true);
          scope.$watch("orderinfo.s.selected_date", function() {
            var selected_date_string = scope.orderinfo.s.selected_date ? scope.orderinfo.s.selected_date.format("dddd, MMMM DD, Y") : "";
            $j(element).find("span.service-date input").val(selected_date_string);
            $j(element).find("span.additional_message input").val(scope.orderinfo.s.additional_message);
            var eventdate = OrderHelper.EventDateTimeStringBuilder(scope.orderinfo.s.selected_date, scope.orderinfo.s.service_time);
            $j(element).find("span.eventdate input").val(eventdate);
            ConfirmationSubjectSetter();
            ConfirmationBodySetter();
            AutomatedInstructionsSetter();
          }, true);
          scope.$watch("orderinfo.s.service_time", function() {
            $j(element).find("span.service-time input").val($filter("MinutesToPrintTime")(scope.orderinfo.s.service_time));
            var eventdate = OrderHelper.EventDateTimeStringBuilder(scope.orderinfo.s.selected_date, scope.orderinfo.s.service_time);
            $j(element).find("span.eventdate input").val(eventdate);
            ConfirmationSubjectSetter();
            ConfirmationBodySetter();
            AutomatedInstructionsSetter();
          }, true);
          scope.$watch("orderinfo.s.phone_number", function() {
            $j(element).find("span.phonenum input").val(scope.orderinfo.s.phone_number);
            EventDetailSetter();
            ConfirmationBodySetter();
          }, true);
          scope.$watch("orderinfo.s.email_address", function() {
            $j(element).find("span.user-email input").val(scope.orderinfo.s.email_address);
          }, true);
          scope.$watch("orderinfo.s.delivery_address", function() {
            $j(element).find("span.address input").val(scope.orderinfo.s.delivery_address);
          }, true);
          scope.$watch("orderinfo.s.delivery_zipcode", function() {
            $j(element).find("span.zipcode input").val(scope.orderinfo.s.delivery_zipcode);
          }, true);
          scope.$watch("orderinfo.s.referral", function() {
            $j(element).find("span.howdyouhear input").val(scope.orderinfo.s.referral);
          }, true);
          scope.$watch("orderinfo.s.special_instructions", function() {
            ParseSpecialInstructionsAndPopulateResponses();
            var temp = scope.orderinfo.s.special_instructions.length > 0 ? "Special instructions: " + scope.orderinfo.s.special_instructions : "";
            $j(element).find("span.special_instructions input").val(temp);
            EventTitleSetter();
            EventDetailSetter();
            AutomatedInstructionsSetter();
          }, true);
          scope.$watch("orderinfo.s.cartstring", function() {
            $j(element).find("span.your-order textarea").val(scope.orderinfo.s.cartstring);
            $j(element).find("span.your-order-short textarea").val(scope.orderinfo.s.shortcartstring);
            EventTitleSetter();
            EventDetailSetter();
          }, true);

          function UpdateCurrentTime() {
            var time_diff = moment().valueOf() - timing_info.browser_load_time.valueOf();
            if (time_diff < timing_info.load_time_diff) {
              // cheater cheater
              location.reload();
            }
            else {
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
          element.on("$destroy", function(){
            $interval.cancel(time_updater);
          });
        }
      };
    }]);

    app.directive("address", function() {
      return {
        require: "ngModel",
        link: function(scope, elm, attrs, ctrl) {
          ctrl.$validators.address = function(modelValue, viewValue) {
            if (ctrl.$isEmpty(modelValue)) {
              // consider empty models to be invalid
              return false;
            }
            return true;
          };
        }
      };
    });

    app.directive("zipcode", function() {
      return {
        require: "ngModel",
        link: function(scope, elm, attrs, ctrl) {
          var ZIPCODE_REGEX = /^\d{5}(?:[\-\s]\d{4})?$/;
          ctrl.$validators.zipcode = function(modelValue, viewValue) {
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


    app.directive("jqdatepicker", ["OrderHelper", function(OrderHelper) {
      return {
        restrict: "A",
        require: "ngModel",
        scope: {
          orderinfo: "=orderinfo",
        },
        link: function(scope, element, attrs, ctrl) {
          var DateActive = function(date) {
            var is_active = OrderHelper.IsDateActive(moment(date), scope.orderinfo.s.service_type, scope.orderinfo.s.num_pizza, scope.orderinfo.s.cart_based_lead_time);
            var tooltip = is_active ? "Your order can be placed for this date." : "Your order cannot be placed for this date.";
            return [is_active, "", tooltip];
          };
          $j(element).datepicker({
            dateFormat: "DD, MM dd, yy",
            minDate: -1,
            beforeShowDay: DateActive,
            onSelect: function(date) {
              ctrl.$setViewValue(date);
              ctrl.$render();
              scope.$apply();
            }
          });
        }
      };
    }]);

    app.directive("jqmaskedphone", function() {
      return {
        restrict: "A",
        require: "ngModel",
        link: function(scope, element, attrs, ctrl) {
          $j.mask.definitions['8'] = "[2-9]";
          $j(element).mask("(899) 999-9999");
        }
      };
    });

    $j(".scrolltotop").click(function() {
      ScrollTopJQ();
    });

    $j("span.user-email input").on("blur", function(event) {
      $j(this).mailcheck({
        suggested: function(element, suggestion) {
          $j("div.user-email-tip").html("Did you mean <b><i>" + suggestion.full + "</i></b>?");
        },
        empty: function(element) {
          $j("div.user-email-tip").html("");
        }
      });
    });

  })();
