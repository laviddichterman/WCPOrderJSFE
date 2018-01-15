  // TODO: handle leaving page before submitting (onbeforeunload)
  // TODO: guided menu help/suggestions (advanced, suggest meatza + giard, etc)
  // TODO: tooltip explanations of disabled items
  // TODO: half toppings UI
  // TODO: notice about cancellation
  // TODO: intercept back/forward button
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
    this.order_placed_during_dining = false;
  };

  var timing_info = new TimingInfo();
  var toppings_dict = {};

  var no_restriction = function(pizza) {
    return true;
  };
  var enable_on_white = function(pizza) {
    return pizza && pizza.sauce.shortname == "white";
  };
  var disable_on_gf = function(pizza) {
    return pizza && pizza.crust.dough.shortname == "regular";
  };
  var disable_on_brussels_sprout = function (pizza) {
    return pizza && pizza.toppings_tracker[toppings_dict.brussels.index] > 0 ? false : true;
  };
  var disable_on_meatball = function (pizza) {
    return pizza && pizza.toppings_tracker[toppings_dict.meatball.index] > 0 ? false : true;
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

  var cheese_options = {
    regular: {
      name: "Mozzarella",
      shortname: "regular",
      price: 0,
      enable: no_restriction
    },
    ex_mozz: {
      name: "Extra Mozzarella",
      shortname: "ex_mozz",
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

  var WCPCrust = function(name, shortname, price, enable_filter, flavor, dough, leadtime) {
    WCPOption.call(this, name, shortname, price);
    this.enable = enable_filter;
    this.flavor = flavor;
    this.dough = dough;
    this.leadtime = leadtime;
    this.ShowOption = function(pizza) {
      return pizza && (this.enable(pizza) || pizza.crust == this.shortname);
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

  var crust_flavors = {
    regular: new WCPOption("Regular", "regular", 0),
    garlic: new WCPOption("Roasted Garlic Crust", "garlic", 2)
  };

  var crust_doughs = {
    regular: new WCPOption("Regular", "regular", 0),
    gf: new WCPOption("Gluten Free Dough", "gf", 5)
  };

  var crusts = {
    regular: new WCPCrust("Regular", "regular", 0, no_restriction, crust_flavors.regular, crust_doughs.regular, 0),
    garlic: new WCPCrust("Roasted Garlic", "garlic", 2, no_restriction, crust_flavors.garlic, crust_doughs.regular, 0),
    gf: new WCPCrust("Gluten Free", "gf", 5, disable_on_meatball, crust_flavors.regular, crust_doughs.gf, 1440),
    gf_garlic: new WCPCrust("Roasted Garlic Gluten Free", "gf_garlic", 7, disable_on_meatball, crust_flavors.garlic, crust_doughs.gf, 1440),
  };

  var idx = 0;
  var toppings_array = [
    new WCPTopping("Pepperoni", "pepperoni", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Spinach", "spin", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Jalapeño", "jala", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Mushroom", "mush", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Castelvetrano Olive", "castel", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Kalamata Olive", "kala", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Raw Red Onion", "raw_onion", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Caramelized Onion", "carm_onion", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Sweet Hot Pepper", "shp", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Green Bell Pepper", "greenbp", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Roasted Red Bell Pepper", "rbp", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Pineapple", "pine", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Rosemary Chicken Sausage", "chix", 2, idx++, disable_on_pork_sausage, 1, 1),
    new WCPTopping("House Sausage", "sausage", 2, idx++, disable_on_chicken_sausage, 1, 1),
    new WCPTopping("Meatball", "meatball", 4, idx++, disable_on_gf, 1, 2),
    new WCPTopping("Brussels Sprout", "brussels", 2, idx++, enable_on_white, 1, 1),
    new WCPTopping("Candied Bacon", "bacon", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Bleu", "bleu", 2, idx++, no_restriction, 1, 1),
    new WCPTopping("Hot Giardiniera", "giard", 2, idx++, no_restriction, 1, 1),
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
      val = val + pizza.crust.price;
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

    function GetSauceDoughCrustCheeseList(pizza, getter, verbose) {
      var ret = [];
      if (verbose || pizza.sauce.shortname != sauces.red.shortname ) {
        ret.push(getter(pizza.sauce));
      }
      if (pizza.crust.dough.shortname != "regular") {
        ret.push(getter(pizza.crust.dough));
      }
      if (pizza.crust.flavor.shortname != "regular") {
        ret.push(getter(pizza.crust.flavor));
      }
      if (verbose || pizza.cheese_option != cheese_options.regular.shortname ) {
        ret.push(getter(cheese_options[pizza.cheese_option]));
      }
      return ret;
    }

    function BuildCustomShortcode(pizza) {
      var shortcode_builder = "";
      if (pizza.crust.shortname == crusts.regular && pizza.sauce.shortname == "red") {
        shortcode_builder = "z";
      }
      if (pizza.crust.dough == crust_doughs.gf) {
        shortcode_builder = "k";
      }
      if (pizza.crust.flavor == crust_flavors.garlic) {
        shortcode_builder = shortcode_builder + "g";
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
      var sauce_dough_crust_cheese = GetSauceDoughCrustCheeseList(this, function(x) { return x.name; }, true);
      whole_toppings = sauce_dough_crust_cheese.concat(whole_toppings);
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
      sections.push(GetSauceDoughCrustCheeseList(this, function(x) { return x.name; }, true).join(" + "));

      var whole_toppings = split_toppings.whole.map(function(x) { return toppings_array[x].name; });
      if (whole_toppings.length > 0) {
        sections.push(whole_toppings.join(" + "));
      }
      if (this.is_split) {
        var left = split_toppings.left.length > 0 ? split_toppings.left.map(function(x) { return toppings_array[x].name; }).join(" + ") : "∅";
        var right = split_toppings.right.length > 0 ? split_toppings.right.map(function(x) { return toppings_array[x].name; }).join(" + ") : "∅";
        sections.push("(" + [left, right].join(" | ") + ")");
      }
      return sections.join(" + ");
    };

    this.ShortOneLineName = function() {
      if (this.name == wcpconfig.PIZZA_MENU.byo.name) {
        var split_toppings = this.SplitToppingsList();
        var sections = [];
        var sauce_dough_crust_cheese = GetSauceDoughCrustCheeseList(this, function(x) { return x.shortname; }, false).reverse();
        if (sauce_dough_crust_cheese.length > 0) {
          sections.push(sauce_dough_crust_cheese.join(" + "));
        }
        var whole_toppings = split_toppings.whole.map(function(x) { return toppings_array[x].shortname; });
        if (whole_toppings.length > 0) {
          sections.push(whole_toppings.join(" + "));
        }
        if (this.is_split) {
          var left = split_toppings.left.length > 0 ? split_toppings.left.map(function(x) { return toppings_array[x].shortname; }).join(" + ") : "∅";
          var right = split_toppings.right.length > 0 ? split_toppings.right.map(function(x) { return toppings_array[x].shortname; }).join(" + ") : "∅";
          sections.push("(" + [left, right].join(" | ") + ")");
        }
        var short_item_name = sections.join(" + ");
        return short_item_name === "" ? "cheese" : short_item_name;
      }
      return this.name;
    };

    this.Compare = function(other) {
      // 0 no match
      // 1 at least
      // 2 exact match
      var sauce_match = this.sauce == other.sauce ? 2 : 1;
      var crust_match = (this.crust.flavor == other.crust.flavor) ? 2 : (other.crust.flavor.shortname == "regular") ? 1 : 0;
      var cheese_match = this.cheese_option == other.cheese_option ? 2 : (other.cheese_option == "regular" ? 1 : 0);
      var dough_match = (this.crust.dough == other.crust.dough) ? 2 : (other.crust.dough.shortname == "regular") ? 1 : 0;
      var toppings_match = [[], []];
      var non_topping_match = Math.min(sauce_match, crust_match, cheese_match, dough_match);
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
        dough: dough_match,
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
      // TODO: this logic lacks elegance. Fix that.
      var byo_shortcode = BuildCustomShortcode(this);
      var shortcodes = [byo_shortcode, byo_shortcode];

      var menu_match = [null, null];
      var shortname_components = {sauce: null, cheese: null, dough: null, crust: null, split: null, whole: null};
      var name_components = {sauce: null, cheese: null, dough: null, crust: null, split: null, whole: null};
      var toppings_name_tracker = [];
      for (var i in toppings_array) {
        toppings_name_tracker.push([0, 0]);
      }

      function ComputeForSide(pizza, idx, comparison, menu_compare) {
        if (menu_match[idx] !== null) {
          return;
        }
        switch(comparison) {
          case 2: // exact match
            menu_match[idx] = pizza_menu[menu_compare];
            shortcodes[idx] = pizza_menu[menu_compare].shortcode;
            break;
          case 1: // at least other
            // menu pizza with add-ons

            // first pull out any sauce, dough, crust, cheese differences
            if (menu_compare === "byo") {
              name_components.sauce = pizza.sauce;
              name_components.cheese = cheese_options[pizza.cheese_option];
            }
            if (comparison_info.sauce === 1) {
              shortname_components.sauce = name_components.sauce = pizza.sauce;
            }
            if (comparison_info.dough === 1) {
              shortname_components.dough = name_components.dough = pizza.crust.dough;
            }
            if (comparison_info.crust === 1) {
              shortname_components.crust = name_components.crust = pizza.crust.flavor;
            }
            if (comparison_info.cheese === 1) {
              shortname_components.cheese = name_components.cheese = cheese_options[pizza.cheese_option];
            }

            // determine what toppings are additions for the matching pizza
            for (var i in comparison_info.toppings[idx]) {
              if (comparison_info.toppings[idx][i] === 1) {
                toppings_name_tracker[i][idx] = 1;
              }
            }
            menu_match[idx] = pizza_menu[menu_compare];
            break;
          default: // no match, no need to create any name
        }
      }

      function BuildName(pizza) {
        console.assert(menu_match[0] !== null && menu_match[1] !== null, "We should have both names determined by now.");
        // assign shortcode (easy)
        pizza.shortcode = pizza.is_split && shortcodes[0] !== shortcodes[1] ? shortcodes.join("|") : shortcodes[0];

        // split out toppings into left additions, right additions, and whole additions
        var additional_toppings = {left: [], right: [], whole: []};
        for (var i in toppings_name_tracker) {
          if (toppings_name_tracker[i][0] === 1 && toppings_name_tracker[i][1] === 1) {
            additional_toppings.whole.push(toppings_array[i]);
          }
          else if (toppings_name_tracker[i][0] === 1 && toppings_name_tracker[i][1] === 0) {
            additional_toppings.left.push(toppings_array[i]);
          }
          else if (toppings_name_tracker[i][0] === 0 && toppings_name_tracker[i][1] === 1) {
            additional_toppings.right.push(toppings_array[i]);
          }
        }
        var split_toppings = ["∅", "∅"];
        var short_split_toppings = ["∅", "∅"];
        if (additional_toppings.left.length) {
          split_toppings[0] = additional_toppings.left.map(function(x) { return x.name; }).join(" + ");
          short_split_toppings[0] = additional_toppings.left.map(function(x) { return x.shortname; }).join(" + ");
        }
        if (additional_toppings.right.length) {
          split_toppings[1] = additional_toppings.right.map(function(x) { return x.name; }).join(" + ");
          short_split_toppings[1] = additional_toppings.right.map(function(x) { return x.shortname; }).join(" + ");
        }

        function BuildNameComponentsList() {
          var lst = [];
          if (name_components.sauce) {
            lst.push(name_components.sauce.name);
          }
          if (name_components.dough) {
            lst.push(name_components.dough.name);
          }
          if (name_components.crust) {
            lst.push(name_components.crust.name);
          }
          if (name_components.cheese) {
            lst.push(name_components.cheese.name);
          }
          return lst.concat(additional_toppings.whole.map(function(x) { return x.name; }));
        }

        var name_components_list = null;
        if (pizza.is_split) {
          name_components_list = BuildNameComponentsList();
          if (menu_match[0].name == menu_match[1].name) {
            if (menu_match[0] !== pizza_menu["byo"]) {
              name_components_list.unshift(menu_match[0].name);
            }
            name_components_list.push("(" + split_toppings.join(" | ") + ")");
          }
          else {
            var names = [(menu_match[0] !== pizza_menu["byo"]) ? [menu_match[0].name] : [], (menu_match[1] !== pizza_menu["byo"]) ? [menu_match[1].name] : []];
            if (additional_toppings.left.length) {
              names[0].push(split_toppings[0]);
            }
            if (additional_toppings.right.length) {
              names[1].push(split_toppings[1]);
            }
            names[0].length ? 0 : names[0].push("∅");
            names[1].length ? 0 : names[1].push("∅");
            name_components_list.push("(" + names[0].join(" + ") + " | " + names[1].join(" + ") + ")");
          }
        }
        else if (menu_match[0] === pizza_menu["byo"]) {
          // we've got a build your own pizza, make sure sauce and cheese name components are present
          name_components.sauce = name_components.sauce !== null ? name_components.sauce : menu_match[0].sauce;
          name_components.cheese = name_components.cheese !== null ? name_components.cheese : cheese_options[menu_match[0].cheese_option];
          name_components_list = BuildNameComponentsList();
        }
        else {
          name_components_list = BuildNameComponentsList();
          name_components_list.unshift(menu_match[0].name);
        }
        pizza.name = name_components_list.join(" + ");
      }

      // iterate through menu, until has_left and has_right are true
      // a name can be assigned once an exact or at least match is found for a given side
      for (var menu_pizza in pizza_menu) {
        var comparison_info = this.Compare(pizza_menu[menu_pizza]);
        var comparison_left = Math.min.apply(null, [comparison_info.min_non_topping, comparison_info.min_topping_left]);
        var comparison_right = Math.min.apply(null, [comparison_info.min_non_topping, comparison_info.min_topping_right]);
        ComputeForSide(this, 0, comparison_left, menu_pizza);
        ComputeForSide(this, 1, comparison_right, menu_pizza);
        if (menu_match[0] !== null && menu_match[1] !== null) {
          // finished, proceed to build the names and assign shortcodes
          return BuildName(this);
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
      crusts.garlic,
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.pepperoni],
      [TOPPING_WHOLE, toppings_dict.sausage],
      [TOPPING_WHOLE, toppings_dict.carm_onion],
      [TOPPING_WHOLE, toppings_dict.spin]]
    ),
    veggie: new WCPPizza("Veggie",
      "V",
      crusts.regular,
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.rbp],
      [TOPPING_WHOLE, toppings_dict.carm_onion],
      [TOPPING_WHOLE, toppings_dict.mush],
      [TOPPING_WHOLE, toppings_dict.spin]]
    ),
    classic: new WCPPizza("Classic",
      "C",
      crusts.regular,
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.sausage],
      [TOPPING_WHOLE, toppings_dict.rbp],
      [TOPPING_WHOLE, toppings_dict.carm_onion],
      [TOPPING_WHOLE, toppings_dict.mush]]
    ),
    popeye: new WCPPizza("Popeye",
      "P",
      crusts.regular,
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.bleu],
      [TOPPING_WHOLE, toppings_dict.kala],
      [TOPPING_WHOLE, toppings_dict.mush],
      [TOPPING_WHOLE, toppings_dict.spin]]
    ),
    sweet_pete: new WCPPizza("Sweet Pete",
      "S",
      crusts.regular,
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.giard],
      [TOPPING_WHOLE, toppings_dict.bacon],
      [TOPPING_WHOLE, toppings_dict.sausage],
      [TOPPING_WHOLE, toppings_dict.pine]]
    ),
    hot_island: new WCPPizza("Hot Island",
      "H",
      crusts.garlic,
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.sausage],
      [TOPPING_WHOLE, toppings_dict.pine],
      [TOPPING_WHOLE, toppings_dict.jala]]
    ),
    four_pepper: new WCPPizza("4 Pepper",
      "F",
      crusts.garlic,
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.rbp],
      [TOPPING_WHOLE, toppings_dict.greenbp],
      [TOPPING_WHOLE, toppings_dict.shp],
      [TOPPING_WHOLE, toppings_dict.jala]]
    ),
    meatza: new WCPPizza("Meatza",
      "M",
      crusts.regular,
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.bacon],
      [TOPPING_WHOLE, toppings_dict.pepperoni],
      [TOPPING_WHOLE, toppings_dict.sausage]]
    ),
    tuscany_raider: new WCPPizza("Tuscany Raider",
      "T",
      crusts.regular,
      "regular",
      sauces.white,
      [[TOPPING_WHOLE, toppings_dict.chix],
      [TOPPING_WHOLE, toppings_dict.shp],
      [TOPPING_WHOLE, toppings_dict.spin]]
    ),
    brussels_snout: new WCPPizza("Brussels Snout",
      "R",
      crusts.regular,
      "regular",
      sauces.white,
      [[TOPPING_WHOLE, toppings_dict.bacon],
      [TOPPING_WHOLE, toppings_dict.brussels],
      [TOPPING_WHOLE, toppings_dict.carm_onion]]
    ),
    blue_pig: new WCPPizza("Blue Pig",
      "B",
      crusts.regular,
      "regular",
      sauces.red,
      [[TOPPING_WHOLE, toppings_dict.bleu],
      [TOPPING_WHOLE, toppings_dict.bacon]]
    ),
    byo: new WCPPizza("Build-Your-Own",
      "z",
      crusts.regular,
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
      [16*60, 22*60], //monday
      [16*60, 22*60], //tuesday
      [11*60, 22*60], //wednesday
      [11*60, 22*60], //thursday
      [11*60, 23*60], //friday
      [11*60, 23*60]  //saturday
    ];

    this.DINEIN_HOURS = [
      [12*60, 21.5*60], //sunday
      [16*60, 21.5*60], //monday
      [16*60, 21.5*60], //tuesday
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
    this.NOTE_SPECIAL_INSTRUCTIONS = "Since you specified special instructions, we will let you know if we can accommodate your request. We may need your confirmation if your instructions will incur an additional cost or we cannot accommodate them, so please watch your email.";
    this.NOTE_KEEP_LEVEL = "Be sure to travel with your pizza as flat as possible, on the floor or in the trunk. Seats are generally not a level surface.";
    this.NOTE_PICKUP_BEFORE_DI = "We won't be open for dine-in at the time of your pickup. Our door will be locked. Please text 206.486.4743 or respond to this email thread when you've arrived at the northernmost door of 1417 Elliott Ave W, 98119, facing Elliott Ave W so we can let you in. Please let us know if you have any additional questions about the pickup process.";
    this.NOTE_PICKUP_DURING_DI = "We'll be open for dining service so please come to the Windy City Pie counter inside the Batch Bar and inform us the name under which the order was placed.";
    this.NOTE_DI = "Please come to our counter and let us know the name under which your order was placed. Please arrive promptly so your pizza is as fresh as possible and you have time to get situated and get beverages from the Batch Bar.";
    this.NOTE_DELIVERY_BETA = "Our catering offering is current in a limited beta. We'll reach out shortly to determine our availability for the requested time and to get a better idea of your needs.";
    this.NOTE_PAYMENT = "We happily accept any major credit card or cash for payment upon arrival.";

    this.REQUEST_SLICING = "In order to ensure the quality of our pizzas, we will not slice them. We'd recommend bringing anything from a bench scraper to a butter knife to slice the pizza. Slicing the whole pizza when it's hot inhibits the crust from properly setting, and can cause the crust to get soggy both during transit and as the pie is eaten. We want your pizza to be the best possible and bringing a tool with which to slice the pie will make a big difference.";
    this.REQUEST_VEGAN = "Our pizzas cannot be made vegan or without cheese. If you're looking for a vegan option, our Beets By Schrute salad can be made vegan by omitting the bleu cheese.";
    this.REQUEST_HALF = "While half toppings are not on the menu, we can do them (with the exception of half roasted garlic crust or half red sauce, half white sauce) but they are charged the same as full toppings. As such, we recommend against them as they're not a good value for the customer and an imbalance of toppings will cause uneven baking of your pizza.";
    // END user messaging

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

    this.IsIllinoisAreaCode = function(phone) {
      var numeric_phone = phone.match(/\d/g);
      numeric_phone = numeric_phone.join("");
      return (numeric_phone.length == 10 && (numeric_phone.slice(0,3)) in this.cfg.AREA_CODES);
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

    this.GetServiceIntervalsForDate = function(date, service) {
      var blocked_off = this.GetBlockedOffForDate(date, service);
      var minmax = this.cfg.HOURS_BY_SERVICE_TYPE[service][date.getDay()];
      if (blocked_off.length === 0) {
        return [minmax];
      }
      var earliest = this.HandleBlockedOffTime(blocked_off, minmax[0]);
      var interval = [earliest, earliest];
      var intervals = [];
      while (earliest <= minmax[1]) {
        var next_time = this.HandleBlockedOffTime(blocked_off, earliest + this.cfg.TIME_STEP);
        if (next_time != earliest + this.cfg.TIME_STEP || next_time > minmax[1]) {
          intervals.push(current_interval);
          current_interval = [next_time, next_time];
        }
        else {
          current_interval[1] = next_time;
        }
        earliest = next_time;
      }
      return intervals;
    }

    this.GetFirstAvailableTime = function(date, service, size, cart_based_lead_time) {
      // param date: the date we're looking for the earliest time
      // param service: the service type enum
      // param size: the order size
      // param cart_based_lead_time: any minimum preorder times associated with the specific items in the cart
      var blocked_off = this.GetBlockedOffForDate(date, service);
      var minmax = this.cfg.HOURS_BY_SERVICE_TYPE[service][date.getDay()];
      // cart_based_lead_time and service/size lead time don't stack
      var leadtime = Math.max(this.cfg.LEAD_TIME[service] + ((size-1) * this.cfg.ADDITIONAL_PIE_LEAD_TIME), cart_based_lead_time);

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

    this.DisableExhaustedDates = function(date, service, size, cart_based_lead_time) {
      // checks if orders can still be placed for the
      // given date, service type, and order size
      // param cart_based_lead_time: any minimum preorder times associated with the specific items in the cart
      // return: true if orders can still be placed, false otherwise
      var maxtime = this.cfg.HOURS_BY_SERVICE_TYPE[service][date.getDay()][1];
      return this.GetFirstAvailableTime(date, service, size, cart_based_lead_time) <= maxtime;
    };

    this.DisableFarOutDates = function(date) {
      // disables dates more than a year out from the current date
      var load_time_plus_year = new Date(timing_info.current_time);
      load_time_plus_year.setFullYear(timing_info.load_time.getFullYear() + 1);
      return date <= load_time_plus_year;
    };

    this.IsDateActive = function(date, service, size, cart_based_lead_time) {
      return !this.IsPreviousDay(date) && this.DisableExhaustedDates(date, service, size, cart_based_lead_time) && this.DisableFarOutDates(date);
    };

    this.GetStartTimes = function(userDate, service, size, cart_based_lead_time) {
      var times = [];
      var earliest = this.GetFirstAvailableTime(userDate, service, size, cart_based_lead_time);
      var blockedOff = this.GetBlockedOffForDate(userDate, service);
      var latest = this.cfg.HOURS_BY_SERVICE_TYPE[service][userDate.getDay()][1];
      while (earliest <= latest) {
        times.push(earliest);
        earliest = this.HandleBlockedOffTime(blockedOff, earliest + this.cfg.TIME_STEP);
      }
      return times;
    };

    this.IsDineInHour = function(date, time) {
      var service_intervals = this.GetServiceIntervalsForDate(date, this.cfg.DINEIN);
      for (var i in service_intervals) {
        if (time >= service_intervals[i][0] && time <= service_intervals[i][1]) {
          return true;
        }
      }
      return false;
    };

    this.AutomatedInstructionsBuilder = function(service_type, date, time, special_instructions, placed_during_dinein) {
      if (date === null || isNaN(time)) {
        return "";
      }
      var service_during_dine_in = this.IsDineInHour(date, time);
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

      var service_during_dine_in = this.IsDineInHour(date, time);
      var service_time_print = this.MinutesToPrintTime(time);
      var nice_area_code = this.IsIllinoisAreaCode(phone);
      var confirm_string_array = [];
      switch (service_type) {
        case this.cfg.DELIVERY: confirm_string_array = ["NOT SUPPORTED"]; break;
        case this.cfg.PICKUP:
          if (service_during_dine_in) {
            var opener = nice_area_code ? "Nice area code! " : "";
            confirm_string_array = [
              opener,
              "We're happy to confirm your pickup order for ",
              service_time_print,
              " at the Batch Bar (1417 Elliott Ave W, 98119, the northernmost door).\n\n",
              this.cfg.NOTE_PICKUP_DURING_DI,
              " We are a 21 and up establishment, so let us know now if anyone in the party is under 21 so we can make alternate arrangements for pickup. If you have any questions please contact us immediately by responding to this email thread. ",
              this.cfg.NOTE_PAYMENT
            ];
          }
          else {
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
          break;
        case this.cfg.DINEIN:
          var opener = nice_area_code ? "Nice area code! " : "";
          confirm_string_array = [
            opener,
            "We're happy to confirm your order for ",
            service_time_print,
            " at the Batch Bar (1417 Elliott Ave W, 98119, the northernmost door).\n\n",
            this.cfg.NOTE_DI,
            " We do not reserve seating.",
            " If anyone in your party is under 21, they will not be able to dine-in, per WA state liquor law. Let us know if this will be an issue immediately. ",
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

      this.ComputeCartBasedLeadTime = function() {
        this.cart_based_lead_time = 0;
        for (var i in this.cart.pizza) {
          this.cart_based_lead_time = Math.max(this.cart_based_lead_time, this.cart.pizza[i][1].crust.leadtime);
        }
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
      this.split_toppings = true;//$location.search().split === true;

      var enable_delivery = $location.search().delivery === true;

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
            !OrderHelper.IsDateActive(new Date(parsedDate), this.s.service_type, this.s.num_pizza, this.s.cart_based_lead_time)) {
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

          this.s.service_times = OrderHelper.GetStartTimes(this.s.selected_date, this.s.service_type, this.s.num_pizza, this.s.cart_based_lead_time);

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
          var short_item_name = item.ShortOneLineName();
          // if we need to identify this by its ingredients and not a "name"
          if (item.name == wcpconfig.PIZZA_MENU.byo.name) {
            item_name = item.OneLineDisplayToppings();
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
          '<span ng-if="ctrl.description" class="desc__content">'+
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

          var ParseSpecialInstructionsAndPopulateResponses = function() {
            scope.orderinfo.s.special_instructions_responses = [];
            var special_instructions_lower = scope.orderinfo.s.special_instructions.toLowerCase();
            if (special_instructions_lower.indexOf("split") >= 0 || special_instructions_lower.indexOf("half") >= 0 || special_instructions_lower.indexOf("1/2") >= 0) {
              scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_HALF);
            }
            if (special_instructions_lower.indexOf("slice") >= 0 || special_instructions_lower.indexOf("cut") >= 0) {
              scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_SLICING);
            }
            if (special_instructions_lower.indexOf("no cheese") >= 0 || special_instructions_lower.indexOf("vegan") >= 0 || special_instructions_lower.indexOf("without cheese") >= 0) {
              scope.orderinfo.s.special_instructions_responses.push(wcpconfig.REQUEST_VEGAN);
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
            AutomatedInstructionsSetter();
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
            var time_diff = new Date().getTime() - timing_info.browser_load_time.getTime();
            if (time_diff < timing_info.load_time_diff) {
              // cheater cheater
              location.reload();
            }
            else {
              timing_info.load_time_diff = time_diff;
            }
            timing_info.current_time = new Date(timing_info.load_time.getTime() + timing_info.load_time_diff);
            timing_info.order_placed_during_dining = OrderHelper.IsDineInHour(timing_info.current_time, OrderHelper.DateToMinutes(timing_info.current_time));
            UpdateLeadTime();
            SlowSubmitterCheck();
            AutomatedInstructionsSetter();
          }
          UpdateCurrentTime();
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
            var is_active = OrderHelper.IsDateActive(date, scope.orderinfo.s.service_type, scope.orderinfo.s.num_pizza, scope.orderinfo.s.cart_based_lead_time);
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
          $j(element).mask("(999) 999-9999");
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
