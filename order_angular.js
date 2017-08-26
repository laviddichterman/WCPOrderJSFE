  // TODO: auto email response
  // TODO: guided menu help/suggestions
  // TODO: tooltip explanations of disabled items
  // TODO: half toppings UI
  // TODO: half pizza naming conventions
  // TODO: notice about cancellation
  // TODO: intercept back/forward button
  // TODO: order small plates
  // TODO: add privacy notice
  // TODO: multiple of same pizza menu guide
  var $j = jQuery.noConflict();

  function ScrollTopJQ() {
    $j("html, body").animate({
        scrollTop: $j("#ordertop").offset().top - 150
    }, 500);
  }

  var TimingInfo = function() {
    this.load_time = new Date([WCP_blog_epoch_time]);
    this.current_time = this.load_time;
    this.browser_load_time = new Date();
    this.load_time_diff = 0;
  };

  var timing_info = new TimingInfo();
  var toppings_dict = {};

  var no_restriction = function(pizza) {
    return true;
  };
  var enable_on_white = function(pizza) {
    return pizza && pizza.sauce.shortname == "white";
  };
  var disable_on_brussels_sprout = function (pizza) {
    return pizza && pizza.toppings_tracker[toppings_dict.brussels.index] > 0 ? false : true;
  };
  var disable_on_chicken_sausage = function (pizza) {
    return pizza && pizza.toppings_tracker[toppings_dict.chix.index] > 0 ? false : true;
  };
  var disable_on_pork_sausage = function (pizza) {
    return pizza && pizza.toppings_tracker[toppings_dict.sausage.index] > 0 ? false : true;
  };

  var WCPOption = function(name, shortname, price) {
    this.name = name;
    this.shortname = shortname;
    this.price = price;
    // should enable filter live here?
  };

  var TOPPING_NONE = 0;
  var TOPPING_LEFT = 1;
  var TOPPING_RIGHT = 2;
  var TOPPING_WHOLE = 3;
  var FLAVOR_MAX = 5;
  var BAKE_MAX = 5;

  var crusts = {
    regular: {
      name: "Regular",
      shortname: "regular",
      price: 0,
      enable: no_restriction
    },
    garlic: {
      name: "Roasted Garlic",
      shortname: "garlic",
      price: 2,
      enable: no_restriction
    }
  };

  var cheese_options = {
    regular: {
      name: "Mozzarella",
      shortname: "regular",
      price: 0,
      enable: no_restriction
    },
    extra_mozz: {
      name: "Extra Mozzarella",
      shortname: "extra_mozz",
      price: 2,
      enable: no_restriction
    }
  };

  var WCPSauce = function(name, shortname, price, enable_filter) {
    WCPOption.call(this, name, shortname, price);
    this.enable = enable_filter;
    this.ShowOption = function(pizza) {
      return pizza && (this.enable(pizza) || pizza.sauce == this.shortname);
    };
  };

  var WCPTopping = function(name, shortname, price, index, enable_filter, flavor_factor, bake_factor) {
    WCPOption.call(this, name, shortname, price);
    this.index = index;
    this.enable = enable_filter;
    this.flavor_factor = flavor_factor;
    this.bake_factor = bake_factor;
    this.ShowOption = function(pizza, location) {
      var base = pizza && this.enable(pizza);
      var this_topping_state = pizza.toppings_tracker[this.index];
      var left_bake = pizza.bake_count[0];
      var right_bake = pizza.bake_count[1];
      var left_flavor = pizza.flavor_count[0];
      var right_flavor = pizza.flavor_count[1];
      switch (location) {
        case TOPPING_NONE: return base;
        case TOPPING_LEFT: return base && (this_topping_state == TOPPING_WHOLE || this_topping_state == TOPPING_LEFT || (left_bake + this.bake_factor <= BAKE_MAX && left_flavor + this.flavor_factor <= FLAVOR_MAX));
        case TOPPING_RIGHT: return base && (this_topping_state == TOPPING_WHOLE || this_topping_state == TOPPING_RIGHT || (right_bake + this.bake_factor <= BAKE_MAX && right_flavor + this.flavor_factor <= FLAVOR_MAX));
        case TOPPING_WHOLE: return base && (this_topping_state == TOPPING_WHOLE || (left_bake + this.bake_factor <= BAKE_MAX && left_flavor + this.flavor_factor <= FLAVOR_MAX && this_topping_state == TOPPING_RIGHT) || (right_bake + this.bake_factor <= BAKE_MAX && right_flavor + this.flavor_factor <= FLAVOR_MAX && this_topping_state == TOPPING_LEFT) || (left_bake + this.bake_factor <= BAKE_MAX && left_flavor + this.flavor_factor <= FLAVOR_MAX && right_bake + this.bake_factor <= BAKE_MAX && right_flavor + this.flavor_factor <= FLAVOR_MAX));
      }
      console.assert(false, "invariant");
      return false; // error?
    };
  };

  var sauces = {
    red: new WCPSauce("Red Sauce", "red", 0, disable_on_brussels_sprout),
    white: new WCPSauce("White Sauce", "white", 2, no_restriction)
  };

  var idx = 0;
  var toppings_array = [
    new WCPTopping("Hot Giardiniera", "giard", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Bleu", "bleu", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Candied Bacon", "bacon", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Brussels Sprout", "brussels", 2, idx++, enable_on_white, 1, 1),
    new WCPTopping("Meatball", "meatball", 4, idx++, no_restriction, 1, 2),
    new WCPTopping("House Sausage", "sausage", 2, idx++, disable_on_chicken_sausage, 1, 1),
    new WCPTopping("Rosemary Chicken Sausage", "chix", 2, idx++, disable_on_pork_sausage, 1, 1),
    new WCPTopping("Pineapple", "pine", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Red Bell Pepper", "rbp", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Sweet Hot Pepper", "shp", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Caramelized Onion", "onion", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Raw Red Onion", "raw_onion", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Kalamata Olive", "kala", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Castelvetrano Olive", "castel", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Mushroom", "mush", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Jalapeño", "jala", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Spinach", "spin", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Pepperoni", "pepperoni", 2, idx++, no_restriction, 1, 1)
  ];
  function initializeToppingsDict() {
    for (var i in toppings_array) {
      toppings_dict[toppings_array[i].shortname] = toppings_array[i];
    }
  }
  initializeToppingsDict();

  var pizza_menu = {};
  var salad_menu = {};

  var WCPProduct = function(name, shortcode, price) {
    this.name = name;
    this.shortcode = shortcode;
    this.price = price;
  };

  var WCPSalad = function(name, shortcode, price, description) {
    WCPProduct.call(this, name, shortcode, price);
    this.description = description;
  };

  var WCPPizza = function(name, shortcode, crust, cheese, sauce, toppings) {
    WCPProduct.call(this, name, shortcode, 0);
    // topping enum is 0: none, 1: left, 2: right, 3: both
    // toppings is array<tuple<enum, topping>>
    function ComputePrice(pizza) {
      var val = 19;
      val = val + crusts[pizza.crust].price;
      val = val + cheese_options[pizza.cheese_option].price;
      val = val + pizza.sauce.price;
      for (var i in pizza.toppings_tracker) {
        if (pizza.toppings_tracker[i] > 0) {
          val = val + toppings_array[i].price;
        }
      }
      return val;
    }
    function RecomputeToppingsMetadata(pizza) {
      var addon_chz = 0;//pizza.cheese_option != cheese_options['regular'].shortname ? 1 : 0;
      var addon_crust = 0;//pizza.crust != 'regular' ? 1 : 0;
      pizza.bake_count = [addon_chz, addon_chz];
      pizza.flavor_count = [addon_crust, addon_crust];
      pizza.is_split = false;
      for (var i in pizza.toppings_tracker) {
        var topping = pizza.toppings_tracker[i];
        if (topping == TOPPING_LEFT || topping == TOPPING_WHOLE) {
          pizza.bake_count[0] = pizza.bake_count[0] + toppings_array[i].bake_factor;
          pizza.flavor_count[0] = pizza.flavor_count[0] + toppings_array[i].flavor_factor;
        }
        if (topping == TOPPING_RIGHT || topping == TOPPING_WHOLE) {
          pizza.bake_count[1] = pizza.bake_count[1] + toppings_array[i].bake_factor;
          pizza.flavor_count[1] = pizza.flavor_count[1] + toppings_array[i].flavor_factor;
        }
        pizza.is_split = pizza.is_split || topping == TOPPING_LEFT || topping == TOPPING_RIGHT;
      }
    }

    function GetCrustCheeseSauceList(pizza, getter, verbose) {
      var ret = [];
      if (pizza.crust != "regular") {
        ret.push(getter(crusts[pizza.crust]));
      }
      if (verbose || pizza.cheese_option != cheese_options.regular.shortname ) {
        ret.push(getter(cheese_options[pizza.cheese_option]));
      }
      if (verbose || pizza.sauce.shortname != sauces.red.shortname ) {
        ret.push(getter(pizza.sauce));
      }
      return ret;
    }

    function BuildCustomShortcode(pizza) {
      var shortcode_builder = "";
      if (pizza.crust == "regular" && pizza.sauce.shortname == "red") {
        shortcode_builder = "z";
      }
      if (pizza.crust == "garlic") {
        shortcode_builder = "g";
      }
      if (pizza.sauce.shortname == "white") {
        shortcode_builder = shortcode_builder + "w";
      }
      return shortcode_builder;
    }

    // begin member functions
    this.GenerateToppingsList = function() {
      // generates and returns a topping list for use by the constructor or something iterating over the toppings
      var new_toppings_list = [];
      for (var i in this.toppings_tracker) {
        if (this.toppings_tracker[i] > 0) {
          new_toppings_list.push([this.toppings_tracker[i], toppings_array[i]]);
        }
      }
      return new_toppings_list;
    };

    this.SplitToppingsList = function() {
      // generates three lists ordered from top to bottom: whole toppings, left only toppings, right only toppings
      var ret = { left: [], right: [], whole: []};
      for (var i in this.toppings_tracker) {
        switch(this.toppings_tracker[i]) {
          case 1: ret.left.push(i); break;
          case 2: ret.right.push(i); break;
          case 3: ret.whole.push(i);
        }
      }
      return ret;
    };

    this.DisplayToppings = function() {
      var split_toppings = this.SplitToppingsList();
      var toppings_sections = [];

      //whole toppings begin
      var whole_toppings = split_toppings.whole.map(function(x) { return toppings_array[x].name; });
      var crust_cheese_sauce = GetCrustCheeseSauceList(this, function(x) { return x.name; }, true);
      whole_toppings = whole_toppings.concat(crust_cheese_sauce);
      toppings_sections.push(["Whole", whole_toppings.join(" + ")]);
      //whole toppings end

      //split toppings begin
      if (this.is_split) {
        if (split_toppings.left.length > 0) {
          toppings_sections.push(["Left", split_toppings.left.map(function(x) { return toppings_array[x].name; }).join(" + ")]);
        }
        if (split_toppings.right.length > 0) {
          toppings_sections.push(["Right", split_toppings.right.map(function(x) { return toppings_array[x].name; }).join(" + ")]);
        }
      }
      //split toppings end
      return toppings_sections;
    };

    this.OneLineDisplayToppings = function() {
      var split_toppings = this.SplitToppingsList();
      var sections = [];
      var whole_toppings = split_toppings.whole.map(function(x) { return toppings_array[x].name; });
      if (whole_toppings.length > 0) {
        sections.push(whole_toppings.join(" + "));
      }
      sections.push(GetCrustCheeseSauceList(this, function(x) { return x.name; }, true).join(" + "));
      if (this.is_split) {
        var left = split_toppings.left.length > 0 ? split_toppings.left.map(function(x) { return toppings_array[x].name; }).join(" + ") : "∅";
        var right = split_toppings.right.length > 0 ? split_toppings.right.map(function(x) { return toppings_array[x].name; }).join(" + ") : "∅";
        sections.push("(" + [left, right].join(" | ") + ")");
      }
      return sections.join(" + ");
    };

    this.ShortOneLineDisplayToppings = function() {
      var split_toppings = this.SplitToppingsList();
      var sections = [];
      var crust_cheese_sauce = GetCrustCheeseSauceList(this, function(x) { return x.shortname; }, false).reverse();
      if (crust_cheese_sauce.length > 0) {
        sections.push(crust_cheese_sauce.join(" + "));
      }
      var whole_toppings = split_toppings.whole.reverse().map(function(x) { return toppings_array[x].shortname; });
      if (whole_toppings.length > 0) {
        sections.push(whole_toppings.join(" + "));
      }
      if (this.is_split) {
        var left = split_toppings.left.length > 0 ? split_toppings.left.reverse().map(function(x) { return toppings_array[x].shortname; }).join(" + ") : "∅";
        var right = split_toppings.right.length > 0 ? split_toppings.right.reverse().map(function(x) { return toppings_array[x].shortname; }).join(" + ") : "∅";
        sections.push("(" + [left, right].join(" | ") + ")");
      }
      return sections.join(" + ");
    };

    this.Compare = function(other) {
      // 0 no match
      // 1 at least
      // 2 exact match
      var sauce_match = this.sauce == other.sauce ? 2 : 1;
      var crust_match = (this.crust == other.crust) ? 2 : (other.crust == "regular") ? 1 : 0;
      var cheese_match = this.cheese_option == other.cheese_option ? 2 : (other.cheese_option == "regular" ? 1 : 0);
      var toppings_match = [[], []];
      var non_topping_match = Math.min(sauce_match, crust_match, cheese_match);
      var is_mirror = this.is_split && other.is_split && non_topping_match == 2;
      var min_topping_match_left = 2;
      var min_topping_match_right = 2;
      for (var i in other.toppings_tracker) {
        switch(other.toppings_tracker[i]) {
          case 0:
            switch (this.toppings_tracker[i]) {
              case 0: toppings_match[0].push(2); toppings_match[1].push(2); break;
              case 1: toppings_match[0].push(1); toppings_match[1].push(2); is_mirror = false; break;
              case 2: toppings_match[0].push(2); toppings_match[1].push(1); is_mirror = false; break;
              case 3: toppings_match[0].push(1); toppings_match[1].push(1); is_mirror = false; break;
              default: console.assert(false, "invalid topping value");
            }
            break;
          case 1:
            switch (this.toppings_tracker[i]) {
              case 0: toppings_match[0].push(0); toppings_match[1].push(2); is_mirror = false; break;
              case 1: toppings_match[0].push(2); toppings_match[1].push(2); is_mirror = false; break;
              case 2: toppings_match[0].push(0); toppings_match[1].push(0); break;
              case 3: toppings_match[0].push(2); toppings_match[1].push(1); is_mirror = false; break;
              default: console.assert(false, "invalid topping value");
            }
            break;
          case 2:
            switch (this.toppings_tracker[i]) {
              case 0: toppings_match[0].push(2); toppings_match[1].push(0); is_mirror = false; break;
              case 1: toppings_match[0].push(0); toppings_match[1].push(0); break;
              case 2: toppings_match[0].push(2); toppings_match[1].push(2); is_mirror = false; break;
              case 3: toppings_match[0].push(1); toppings_match[1].push(2); is_mirror = false; break;
              default: console.assert(false, "invalid topping value");
            }
            break;
          case 3:
            switch (this.toppings_tracker[i]) {
              case 0: toppings_match[0].push(0); toppings_match[1].push(0); is_mirror = false; break;
              case 1: toppings_match[0].push(2); toppings_match[1].push(0); is_mirror = false; break;
              case 2: toppings_match[0].push(0); toppings_match[1].push(2); is_mirror = false; break;
              case 3: toppings_match[0].push(2); toppings_match[1].push(2); break;
              default: console.assert(false, "invalid topping value");
            }
            break;
          default: console.assert(false, "invalid topping value");
        }
      }
      return {
        sauce: sauce_match,
        crust: crust_match,
        cheese: cheese_match,
        toppings: toppings_match,
        mirror: is_mirror,
        min_non_topping: non_topping_match,
        min_topping_left: Math.min.apply(null, toppings_match[0]),
        min_topping_right: Math.min.apply(null, toppings_match[1])
      };
    };

    this.EqualsFromComparisonInfo = function(comparison_info) {
      return comparison_info.mirror || (comparison_info.min_non_topping == 2 && comparison_info.min_topping_left == 2 && comparison_info.min_topping_right == 2);
    };

    this.Equals = function(other) {
      var comparison_info = this.Compare(other);
      return this.EqualsFromComparisonInfo(comparison_info);
    };

    this.RecomputeName = function() {
      var byo_shortcode = BuildCustomShortcode(this);
      var has_name = [false, false];
      var names = ["", ""];
      var shortcodes = [byo_shortcode, byo_shortcode];

      function ComputeForSide(pizza, idx, comparison, menu_compare) {
        if (has_name[idx]) {
          return;
        }
        switch(comparison) {
          case 2: // exact match
            names[idx] = pizza_menu[menu_pizza].name;
            shortcodes[idx] = pizza_menu[menu_pizza].shortcode;
            has_name[idx] = true;
            break;
          case 1: // at least other
            if (menu_compare == "byo") {
              // non-menu BYO
              names[idx] = pizza_menu[menu_compare].name;
            }
            else {
              // menu pizza with add-ons
              var new_name = pizza_menu[menu_compare].name;
              new_name = (comparison_info.sauce == 2) ? new_name : new_name.concat(" + ", pizza.sauce.name);
              new_name = (comparison_info.crust == 2) ? new_name : new_name.concat(" + ", crusts[pizza.crust].name);
              new_name = (comparison_info.cheese == 2) ? new_name : new_name.concat(" + ", cheese_options[pizza.cheese_option].name);
              for (var i = comparison_info.toppings[idx].length - 1; i >= 0; --i) { // done in reverse for display ordering
                new_name = (comparison_info.toppings[idx][i] == 2) ? new_name : new_name.concat(" + ", toppings_array[i].name);
              }
              names[idx] = new_name;
            }
            has_name[idx] = true;
            break;
          default: // no match, no need to create any name
        }
      }

      // iterate through menu, until has_left and has_right are true
      // a name can be assigned once an exact or at least match is found for a given side
      for (var menu_pizza in pizza_menu) {
        var comparison_info = this.Compare(pizza_menu[menu_pizza]);
        var comparison_left = Math.min.apply(null, [comparison_info.min_non_topping, comparison_info.min_topping_left]);
        var comparison_right = Math.min.apply(null, [comparison_info.min_non_topping, comparison_info.min_topping_right]);
        ComputeForSide(this, 0, comparison_left, menu_pizza);
        ComputeForSide(this, 1, comparison_right, menu_pizza);
        if (has_name[0] && has_name[1]) {
          // finished, determine full name and assign shortcode
          this.name = this.is_split ? names.join(" | ") : names[0];
          this.shortcode = this.is_split ? shortcodes.join("|") : shortcodes[0];
          return;
        }
      }
    };

    this.UpdatePie = function() {
      this.price = ComputePrice(this);
      RecomputeToppingsMetadata(this);
      this.RecomputeName();
      this.toppings_sections = this.DisplayToppings();
    };

    // begin initialization
    this.crust = crust;
    this.cheese_option = cheese;
    this.sauce = sauce;
    this.toppings_tracker = [];
    this.is_split = false;
    this.toppings_sections = [];
    this.bake_count = [0, 0];
    this.flavor_count = [0, 0];
    for (var i in toppings_array) {
      this.toppings_tracker.push(0);
    }
    for (var j in toppings) {
      this.toppings_tracker[toppings[j][1].index] = toppings[j][0];
    }
    this.UpdatePie();
    // end initialization
  };

  pizza_menu = {
    omnivore: new WCPPizza("Omnivore",
      "O",
      "garlic",
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.pepperoni],
      [TOPPING_WHOLE, toppings_dict.sausage],
      [TOPPING_WHOLE, toppings_dict.onion],
      [TOPPING_WHOLE, toppings_dict.spin]]
    ),
    veggie: new WCPPizza("Veggie",
      "V",
      "regular",
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.rbp],
      [TOPPING_WHOLE, toppings_dict.onion],
      [TOPPING_WHOLE, toppings_dict.mush],
      [TOPPING_WHOLE, toppings_dict.spin]]
    ),
    classic: new WCPPizza("Classic",
      "C",
      "regular",
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.sausage],
      [TOPPING_WHOLE, toppings_dict.rbp],
      [TOPPING_WHOLE, toppings_dict.onion],
      [TOPPING_WHOLE, toppings_dict.mush]]
    ),
    popeye: new WCPPizza("Popeye",
      "P",
      "regular",
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.bleu],
      [TOPPING_WHOLE, toppings_dict.kala],
      [TOPPING_WHOLE, toppings_dict.mush],
      [TOPPING_WHOLE, toppings_dict.spin]]
    ),
    sweet_pete: new WCPPizza("Sweet Pete",
      "S",
      "regular",
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.giard],
      [TOPPING_WHOLE, toppings_dict.bacon],
      [TOPPING_WHOLE, toppings_dict.sausage],
      [TOPPING_WHOLE, toppings_dict.pine]]
    ),
    hot_island: new WCPPizza("Hot Island",
      "H",
      "garlic",
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.sausage],
      [TOPPING_WHOLE, toppings_dict.pine],
      [TOPPING_WHOLE, toppings_dict.jala]]
    ),
    meatza: new WCPPizza("Meatza",
      "M",
      "regular",
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.bacon],
      [TOPPING_WHOLE, toppings_dict.pepperoni],
      [TOPPING_WHOLE, toppings_dict.sausage]]
    ),
    tuscany_raider: new WCPPizza("Tuscany Raider",
      "T",
      "regular",
      "regular",
      sauces.white,
      [[TOPPING_WHOLE, toppings_dict.chix],
      [TOPPING_WHOLE, toppings_dict.shp],
      [TOPPING_WHOLE, toppings_dict.spin]]
    ),
    brussels_snout: new WCPPizza("Brussels Snout",
      "R",
      "regular",
      "regular",
      sauces.white,
      [[TOPPING_WHOLE, toppings_dict.bacon],
      [TOPPING_WHOLE, toppings_dict.brussels],
      [TOPPING_WHOLE, toppings_dict.onion]]
    ),
    blue_pig: new WCPPizza("Blue Pig",
      "B",
      "regular",
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.bleu],
      [TOPPING_WHOLE, toppings_dict.bacon]]
    ),
    byo: new WCPPizza("Build-Your-Own",
      "z",
      "regular",
      "regular",
      sauces.red,
      []
    ),
  };

  salad_menu = {
    beets: new WCPSalad("Beets By Schrute",
      "Be",
      7,
      "Arugula + Roasted Beet + Roasted Pistachio + Bleu + Tarragon Vinaigrette"
    ),
    spinach: new WCPSalad("Spinach Salad",
      "Sp",
      6,
      "Baby Spinach + Chèvre + Candied Pecan + Roasted Red Bell Pepper Vinaigrette + Pickled Red Onion"
    ),
    caesar: new WCPSalad("Caesar Salad",
      "Cz",
      6,
      "Romaine Heart + Parmigiano Reggiano + Caesar Dressing + Garlic Crouton + Lemon Wedge"
    ),
  };


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
      [11*60, 22*60], //sunday
      [11*60, 22*60], //monday
      [1, 0], //tuesday (disabled)
      [11*60, 22*60], //wednesday
      [11*60, 22*60], //thursday
      [11*60, 23*60], //friday
      [11*60, 23*60]  //saturday
    ];

    this.DINEIN_HOURS = [
      [12*60, 21.5*60], //sunday
      [16*60, 21.5*60], //monday
      [1, 0], //tuesday (disabled)
      [16*60, 21.5*60], //wednesday
      [16*60, 21.5*60], //thursday
      [16*60, 22.5*60], //friday
      [12*60, 22.5*60]  //saturday
    ];

    this.DELIVERY_HOURS = [
      [11*60, 22*60], //sunday
      [11*60, 22*60], //monday
      [1, 0], //tuesday (disabled)
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

    //END WCP store config
  };

  var wcpconfig = new WCPStoreConfig();

  var WCPOrderHelper = function() {
    // HELPER FUNCTIONS
    this.cfg = wcpconfig;

    this.IsFirstDatePreviousDayToSecond = function(first, second) {
      var st = new Date(first);
      var nd = new Date(second);
      st.setHours(0, 0, 0, 0, 0);
      nd.setHours(0, 0, 0, 0, 0);
      return st < nd;
    };

    this.IsPreviousDay = function(date) {
      return this.IsFirstDatePreviousDayToSecond(date, timing_info.current_time);
    };

    this.IsSameDay = function(date1, date2) {
      return date1.getDate() == date2.getDate() && date1.getFullYear() == date2.getFullYear() && date1.getMonth() == date2.getMonth();
    };

    this.MinutesToHMS = function(time) {
      var hour = Math.floor(time / 60);
      var minute = time - (hour * 60);
      return String(hour) + (minute < 10 ? "0" : "") + String(minute) + "00";
    };

    this.DateToMinutes = function(date) {
      return date.getHours() * 60 + date.getMinutes();
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

    this.IsDineInHour = function(date, time) {
      var minmax = this.cfg.HOURS_BY_SERVICE_TYPE[this.cfg.DINEIN][date.getDay()];
      return time >= minmax[0] && time <= minmax[1];
    };

    this.IsIllinoisAreaCode = function(phone) {
      var AREA_CODES = {
        "217": "Central Illinois, running west from the Illinois-Indiana border through Danville, Effingham, Champaign–Urbana, Decatur, Springfield, Quincy until Illinois' western border with Iowa.",
        "309": "Central-Western Illinois including Bloomington–Normal, Peoria, and all the way west to the Illinois part of the Quad Cities including Moline, and Rock Island.",
        "312": "Chicago, the central city area including the Chicago Loop and the Near North Side.",
        "630": "West suburbs of Chicago in DuPage County and Kane County including Wheaton, Naperville, and Aurora.",
        "331": "West suburbs of Chicago in DuPage County and Kane County including Wheaton, Naperville, and Aurora.",
        "618": "Southern Illinois, including Carbondale and most of the Metro East region of St. Louis suburbs in Illinois",
        "708": "South suburbs and inner west suburbs of Chicago, including the Chicago Southland and most west and south suburbs in Cook County such as Oak Park, Oak Lawn, Chicago Heights, and Orland Park.",
        "773": "Chicago, covers most of the geographical area of Chicago except the downtown Chicago Loop, which is in area code 312.",
        "815": "Northern Illinois outside of the immediate Chicago area including Joliet, Kankakee, LaSalle, DeKalb, and Rockford.",
        "779": "Northern Illinois outside of the immediate Chicago area including Joliet, Kankakee, LaSalle, DeKalb, and Rockford.",
        "847": "North and northwest suburbs of Chicago including all of Lake County, part of McHenry County, northern Cook County, and northeastern Kane County.",
        "224": "North and northwest suburbs of Chicago including all of Lake County, part of McHenry County, northern Cook County, and northeastern Kane County.",
        "872": "City of Chicago, overlaying area codes 312 and 773."
      };
      var numeric_phone = phone.match(/\d/g);
      numeric_phone = numeric_phone.join("");
      return (numeric_phone.length == 10 && (numeric_phone.slice(0,3)) in AREA_CODES) || (numeric_phone.length == 11 && numeric_phone[0] == "1" && (numeric_phone.slice(1,4)) in AREA_CODES);
    };

    this.EmailSubjectStringBuilder = function(service_type, name, date_string, service_time) {
      if (!name || name.length == 0 || !date_string || date_string.length == 0) {
        return "";
      }
      service_type = this.cfg.SERVICE_TYPES[service_type][0];
      service_time = this.MinutesToPrintTime(service_time);
      //[service-option] for [user-name] on [service-date] - [service-time]
      return encodeURI(service_type + " for " + name + " on " + date_string + " - " + service_time);
    };

    this.EmailBodyStringBuilder = function(service_type, date, time, phone) {
      if (date == null || !Number.isInteger(time)) {
        return "";
      }
      var during_dine_in = this.IsDineInHour(date, time);
      var service_time_print = this.MinutesToPrintTime(time);
      var nice_area_code = this.IsIllinoisAreaCode(phone);
      var confirm_string_array = [];
      if (during_dine_in) {
        confirm_string_array = [
          nice_area_code ? "Nice area code. " : "",
          "We're happy to confirm your order for ",
          service_time_print,
          " at the Batch Bar (<a href=3D\"http://bit.ly/WindyCityPieGoogleMaps\">1417 Elliott Ave W, 98119</a>, the northernmost door).",
          "\n\n",
          "We'll be open for dining service so please come to the counter and inform us the name under which the order was placed. You will be able to eat your pizza on the premises if you choose, but we cannot reserve seating. We are a 21+ establishment, so let us know now if anyone in the party is under 21 so we can make alternate arrangements for pickup. If you have any questions please contact us immediately by responding to this email thread. We accept cash and any major credit card upon pickup."
        ];
      }
      else {
        confirm_string_array = [
          nice_area_code ? "Hello, nice area code," : "Hello",
          " and thanks for your order! We're happy to confirm your pickup for ",
          service_time_print,
          ".\n\n",
          "Here are the pickup instructions, please be sure to read them now:\n",
          "We won't be open for dine-in at the time of your pickup so we'll meet you outside, in one of the Batch 206 parking stalls facing Elliott Ave W (<a href=3D\"http://bit.ly/WindyCityPieGoogleMaps\">1417 Elliott Ave W, 98119</a>). Send a text to <a href=3D\"tel:2064864743\">206.486.4743</a>, or respond to this email thread when you've arrived and we'll be right out with your pizza. We happily accept any major credit card or cash for payment upon pickup, but we can't always make change."
        ];
      }
      return encodeURI(confirm_string_array.join(""));
    };

    this.EventTitleStringBuilder = function(service, customer, cart) {
      if (!customer || cart.pizza.length == 0) {
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
      return service_string + "+" + encodeURI(customer) + (service != this.cfg.DELIVERY ? "" : "+[]") + "+" + num_pizzas + "x" + pizza_shortcodes + (extras_shortcodes.length > 0 ? "+Extras"+extras_shortcodes : "");
    };

    this.EventDateTimeStringBuilder = function(date, time) {
      if(isNaN(date) || isNaN(time) || time < 0) {
        return "";
      }
      var dateString = String(date.getFullYear()) + (date.getMonth() < 9 ? "0" : "") + String(date.getMonth()+1) + (date.getDate() < 10 ? "0" : "") + String(date.getDate()) + "T";
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

    this.GetBlockedOffForDate = function(date, service) {
      for (var i in this.cfg.BLOCKED_OFF[service]) {
        if (this.IsSameDay(this.cfg.BLOCKED_OFF[service][i][0], date)) {
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

    this.GetFirstAvailableTime = function(date, service, size) {
      // param date: the date we're looking for the earliest time
      // param service: the service type enum
      // param size: the order size
      var blocked_off = this.GetBlockedOffForDate(date, service);
      var minmax = this.cfg.HOURS_BY_SERVICE_TYPE[service][date.getDay()];
      var leadtime = this.cfg.LEAD_TIME[service] + ((size-1) * this.cfg.ADDITIONAL_PIE_LEAD_TIME);

      var current_time_plus_leadtime = new Date(timing_info.current_time.getTime() + (leadtime * 60000));
      if (this.IsFirstDatePreviousDayToSecond(date, current_time_plus_leadtime)) {
        // if by adding the lead time we've passed the date we're looking for
        return minmax[1] + this.cfg.TIME_STEP;
      }

      if (this.IsSameDay(date, current_time_plus_leadtime)) {
        var current_time_plus_leadtime_mins_from_start = this.DateToMinutes(current_time_plus_leadtime);
        if (current_time_plus_leadtime_mins_from_start > minmax[0]) {
          return this.HandleBlockedOffTime(blocked_off, Math.ceil((current_time_plus_leadtime_mins_from_start) / this.cfg.TIME_STEP) * this.cfg.TIME_STEP);
        }
      }
      return this.HandleBlockedOffTime(blocked_off, minmax[0]);
    };

    this.DisableExhaustedDates = function(date, service, size) {
      // checks if orders can still be placed for the
      // given date, service type, and order size
      // return: true if orders can still be placed, false otherwise
      var maxtime = this.cfg.HOURS_BY_SERVICE_TYPE[service][date.getDay()][1];
      return this.GetFirstAvailableTime(date, service, size) <= maxtime;
    };

    this.DisableFarOutDates = function(date) {
      // disables dates more than a year out from the current date
      var load_time_plus_year = new Date(timing_info.current_time);
      load_time_plus_year.setFullYear(timing_info.load_time.getFullYear() + 1);
      return date <= load_time_plus_year;
    };

    this.IsDateActive = function(date, service, size) {
      return !this.IsPreviousDay(date) && this.DisableExhaustedDates(date, service, size) && this.DisableFarOutDates(date);
    };

    this.GetStartTimes = function(userDate, service, size) {
      var times = [];
      var earliest = this.GetFirstAvailableTime(userDate, service, size);
      var blockedOff = this.GetBlockedOffForDate(userDate, service);
      var latest = this.cfg.HOURS_BY_SERVICE_TYPE[service][userDate.getDay()][1];
      while (earliest <= latest) {
        times.push(earliest);
        earliest = this.HandleBlockedOffTime(blockedOff, earliest + this.cfg.TIME_STEP);
      }
      return times;
    };
  };

  var wcporderhelper = new WCPOrderHelper();

  var FixQuantity = function(val) {
    if (typeof val === "string" || val instanceof String) {
      val = parseInt(val);
    }
    if (!Number.isSafeInteger(val) || val < 1 || val > 99) {
      val = 1;
    }
    return val;
  };

  function UpdateLeadTime() {
    if (wcporderhelper.IsDateActive(timing_info.current_time, wcpconfig.PICKUP, 1)) {
      var first = wcporderhelper.GetFirstAvailableTime(timing_info.current_time, wcpconfig.PICKUP, 1);
      $j("span.leadtime").html("Next available same-day order: " + wcporderhelper.MinutesToPrintTime(first));
    }
    else {
      $j("span.leadtime").html("");
    }
  }

  (function() {

    var app = angular.module("WCPOrder", []);

    app.filter("MinutesToPrintTime", function() {
      return wcporderhelper.MinutesToPrintTime;
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

      this.date_string = "";
      this.date_valid = false;
      this.service_times = ["Please select a valid date"];
      this.debug_info = {};

      this.service_type = cfg.PICKUP;
      this.selected_date = "";
      this.service_time = "Please select a valid date";
      this.customer_name = "";
      this.phone_number = "";
      this.delivery_address = "";
      this.delivery_zipcode = "";
      this.email_address = "";
      this.cart = {pizza: [], extras:[]};
      this.cartstring = "";
      this.num_pizza = 0;
      this.shortcartstring = "";
      this.referral = "";
      this.acknowledge_instructions_dialogue = false;
      this.special_instructions = "";
      this.additional_message = "";
      this.enable_split_toppings = false;
      this.enable_delivery = enable_delivery;
      this.delivery_fee = 0;

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

    app.controller("OrderController", ["OrderHelper", "$filter", "$location", function(OrderHelper, $filter, $location) {
      this.ORDER_HELPER = OrderHelper;
      this.CONFIG = wcpconfig;
      this.toppings = toppings_array;
      this.sauces = sauces;
      this.cheese_options = cheese_options;
      this.crusts = crusts;
      this.split_toppings = $location.search().split == true;

      var enable_delivery = $location.search().delivery == true;

      this.ScrollTop = ScrollTopJQ;

      this.s = new WCPOrderState(this.CONFIG, enable_delivery, this.split_toppings);

      this.Reset = function() {
        this.s = new WCPOrderState(this.CONFIG, enable_delivery, this.split_toppings);
      };

      this.ServiceTimeChanged = function() {
        // time has changed so log the selection time and clear the timeout flag
        this.s.debug_info["time-selection-time"] = new Date(timing_info.current_time);
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
        this.s.delivery_fee = this.s.delivery_zipcode && this.s.delivery_zipcode.length > 0 ? 5 : 0;
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
            !OrderHelper.IsDateActive(new Date(parsedDate), this.s.service_type, this.s.num_pizza)) {
          this.s.date_valid = false;
          this.s.service_times = ["Please select a valid date"];
          this.s.service_time = "Please select a valid date";
        }
        else {
          // grab the old service_time the date was valid then one must have been selected
          var old_service_time = this.s.date_valid ? this.s.service_time : null;

          this.s.selected_date = new Date(parsedDate);
          this.s.date_string = $filter("date")(this.s.selected_date, "EEEE, MMMM dd, yyyy");
          this.s.date_valid = true;

          this.s.service_times = OrderHelper.GetStartTimes(this.s.selected_date, this.s.service_type, this.s.num_pizza);

          if (!old_service_time || this.s.service_times.findIndex(function(elt, idx, arr) { return elt == old_service_time; }) == -1) {
              this.s.service_time = this.s.service_times[0];
              this.ServiceTimeChanged();
          }
        }

        if (this.s.date_valid && !this.ORDER_HELPER.IsSameDay(this.s.selected_date, timing_info.current_time)) {
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
          var item_name = item.name;
          var short_item_name = item.name;
          // if we need to identify this by its ingredients and not a "name"
          if (item.name == wcpconfig.PIZZA_MENU.byo.name) {
            item_name = item.OneLineDisplayToppings();
            short_item_name = item.ShortOneLineDisplayToppings();
            short_item_name = short_item_name == "" ? "cheese" : short_item_name;
          }
          str_builder = str_builder + quantity + "x: " + item_name + "\n";
          short_builder = short_builder + quantity + "x: " + short_item_name + "\n";
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
        this.rebuildCartString();
        this.ValidateDate();
      };

      this.ChangedContactInfo = function() {
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

      this.fixQuantities = function () {
        for (var item in this.s.cart.pizza) {
          this.s.cart.pizza[item][0] = FixQuantity(this.s.cart.pizza[item][0]);
        }
        for (var j in this.s.cart.extras) {
          this.s.cart.extras[j][0] = FixQuantity(this.s.cart.extras[j][0]);
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
        // set stage to 2 (time selection)
        this.s.stage = 3;
      };

      this.NextStage = function() {
        this.s.stage = this.s.stage + 1;
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
      this.message = "";
      this.suppress_guide = false;

      this.PopulateOrderGuide = function() {
        var addon_chz = this.selection.cheese_option != cheese_options.regular.shortname ? 1 : 0;
        var addon_crust = this.selection.crust != "regular" ? 1 : 0;
        this.message = "";
        if (this.selection) {
          if (this.selection.bake_count[0] + addon_chz + addon_crust < 2 || this.selection.bake_count[1] + addon_chz + addon_crust < 2) {
            this.message = "Our pizza is designed as a vehicle for add-ons. We recommend at least two toppings to weigh the crust down during baking. If this is your first time dining with us, we'd suggest ordering a menu pizza without modifications.";
          }
          else if (this.selection.flavor_count[0] + addon_crust > 5 || this.selection.flavor_count[1] + addon_crust > 5) {
            this.message = "We love our toppings too, but adding this many flavors can end up detracting from the overall enjoyment. We'd suggest scaling this pizza back a bit. If this is your first time dining with us, we'd suggest ordering a menu pizza without modifications.";
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
        this.quantity = FixQuantity(this.quantity);
      };
    });

    app.directive("wcppizzacartitem", function() {
      return {
        restrict: "E",
        scope: {
          pizza: "=pizza",
          dots: "=dots",
          price: "=price",
        },
        controller: function () {
        },
        controllerAs: "ctrl",
        bindToController: true,
        template:
        '<h4 class="menu-list__item-title"><span class="item_title">{{ctrl.pizza.name}}</span><span ng-if="ctrl.dots" class="dots"></span></h4>'+
        '<p ng-repeat="topping_section in ctrl.pizza.toppings_sections" class="menu-list__item-desc">'+
          '<span class="desc__content">'+
            '<span ng-if="ctrl.pizza.is_split"><strong>{{topping_section[0]}}:</strong></span>'+
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


    app.directive("cf7bridge", ["OrderHelper", "$filter", "$interval", function(OrderHelper, $filter, $interval) {
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
          $j(element).find("span.load-time input").val($filter("date")(timing_info.load_time, "HH:mm:ss"));

          var EventTitleSetter = function() {
            var event_title = OrderHelper.EventTitleStringBuilder(scope.orderinfo.s.service_type, scope.orderinfo.s.customer_name, scope.orderinfo.s.cart);
            $j(element).find("span.eventtitle input").val(event_title);
          };
          var EventDetailSetter = function() {
            var eventdetail = OrderHelper.EventDetailStringBuilder(scope.orderinfo.s.shortcartstring, scope.orderinfo.s.phone_number, scope.orderinfo.s.special_instructions);
            $j(element).find("span.eventdetail textarea").val(eventdetail);
          };
          var ConfirmationSubjectSetter = function() {
            var selected_date_string = $filter("date")(scope.orderinfo.s.selected_date, "EEEE, MMMM dd, yyyy");
            var confirmation_subject = OrderHelper.EmailSubjectStringBuilder(scope.orderinfo.s.service_type, scope.orderinfo.s.customer_name, selected_date_string, scope.orderinfo.s.service_time);
            $j(element).find("span.confirmation-subject textarea").val(confirmation_subject);
          };
          var ConfirmationBodySetter = function() {
            var confirmation_body = OrderHelper.EmailBodyStringBuilder(scope.orderinfo.s.service_type, scope.orderinfo.s.selected_date, scope.orderinfo.s.service_time, scope.orderinfo.s.phone_number);
            $j(element).find("span.confirmation-body textarea").val(confirmation_body);
          };
          var SlowSubmitterCheck = function() {
            // TODO: make sure no one is in the middle of customizing a pizza
            var old_time = scope.orderinfo.s.service_time;
            scope.orderinfo.ValidateDate();
            if (old_time != scope.orderinfo.s.service_time && scope.orderinfo.s.stage <= 3) {
              scope.orderinfo.SlowSubmitterTrigger();
            }
          };

          scope.$watch("orderinfo.s.debug_info", function() {
            $j(element).find("span.time-selection-time input").val($filter("date")(scope.orderinfo.s.debug_info["time-selection-time"], "HH:mm:ss"));
          }, true);

          scope.$watch("orderinfo.s.service_type", function() {
            $j(element).find("span.service-option input").val(scope.orderinfo.CONFIG.SERVICE_TYPES[scope.orderinfo.s.service_type][0]);
            EventTitleSetter();
            ConfirmationSubjectSetter();
            ConfirmationBodySetter();
          }, true);
          scope.$watch("orderinfo.s.customer_name", function() {
            $j(element).find("span.user-name input").val(scope.orderinfo.s.customer_name);
            EventTitleSetter();
            ConfirmationSubjectSetter();
          }, true);
          scope.$watch("orderinfo.s.selected_date", function() {
            var selected_date_string = $filter("date")(scope.orderinfo.s.selected_date, "EEEE, MMMM dd, yyyy");
            $j(element).find("span.service-date input").val(selected_date_string);
            $j(element).find("span.additional_message input").val(scope.orderinfo.s.additional_message);
            ConfirmationSubjectSetter();
            ConfirmationBodySetter();
          }, true);
          scope.$watch("orderinfo.s.service_time", function() {
            $j(element).find("span.service-time input").val($filter("MinutesToPrintTime")(scope.orderinfo.s.service_time));
            var eventdate = OrderHelper.EventDateTimeStringBuilder(scope.orderinfo.s.selected_date, scope.orderinfo.s.service_time);
            $j(element).find("span.eventdate input").val(eventdate);
            ConfirmationSubjectSetter();
            ConfirmationBodySetter();
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
            var temp = scope.orderinfo.s.special_instructions.length > 0 ? "Special instructions: " + scope.orderinfo.s.special_instructions : "";
            $j(element).find("span.special_instructions input").val(temp);
            EventDetailSetter();
          }, true);
          scope.$watch("orderinfo.s.cartstring", function() {
            $j(element).find("span.your-order textarea").val(scope.orderinfo.s.cartstring);
            $j(element).find("span.your-order-short textarea").val(scope.orderinfo.s.shortcartstring);
            EventTitleSetter();
            EventDetailSetter();
          }, true);

          function UpdateCurrentTime() {
            var time_diff = new Date().getTime() - timing_info.browser_load_time.getTime();
            if (time_diff < timing_info.load_time_diff) {
              // cheater cheater
              location.reload();
            }
            else {
              timing_info.load_time_diff = time_diff;
            }
            timing_info.current_time = new Date(timing_info.load_time.getTime() + timing_info.load_time_diff);
            UpdateLeadTime();
            SlowSubmitterCheck();
          }
          UpdateLeadTime();
          var time_updater = $interval(UpdateCurrentTime, 60000);

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
            var is_active = OrderHelper.IsDateActive(date, scope.orderinfo.s.service_type, scope.orderinfo.s.num_pizza);
            var tooltip = is_active ? "Currently taking orders for this date" : "We are not taking orders for this date";
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
