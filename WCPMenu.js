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
//  gf: new WCPOption("Gluten Free Dough", "gf", 5)
};

var crusts = {
  regular: new WCPCrust("Regular", "regular", 0, no_restriction, crust_flavors.regular, crust_doughs.regular, 0),
//  garlic: new WCPCrust("Roasted Garlic", "garlic", 2, no_restriction, crust_flavors.garlic, crust_doughs.regular, 0),
//  gf: new WCPCrust("Gluten Free", "gf", 5, disable_on_meatball, crust_flavors.regular, crust_doughs.gf, 1440),
//  gf_garlic: new WCPCrust("Roasted Garlic Gluten Free", "gf_garlic", 7, disable_on_meatball, crust_flavors.garlic, crust_doughs.gf, 1440),
};

var idx = 0;
var toppings_array = [
  new WCPTopping("Roasted Garlic", "garlic", 2, idx++, no_restriction, 1, 0),
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
  new WCPTopping("Artichoke Heart", "art", 2, idx++, no_restriction, 1, 1),
  new WCPTopping("Pineapple", "pine", 2, idx++, no_restriction, 1, 1),
  new WCPTopping("Rosemary Chicken Sausage", "chix", 2, idx++, disable_on_pork_sausage, 1, 1),
  new WCPTopping("House Sausage", "sausage", 2, idx++, disable_on_chicken_sausage, 1, 1),
  new WCPTopping("Meatball", "meatball", 4, idx++, disable_on_gf, 1, 2),
//  new WCPTopping("Braised Beef", "beef", 4, idx++, no_restriction, 1, 2),
  new WCPTopping("Brussels Sprout", "brussels", 2, idx++, enable_on_white, 1, 1),
  new WCPTopping("Candied Bacon", "bacon", 2, idx++, no_restriction, 1, 1),
  new WCPTopping("Bleu", "bleu", 2, idx++, no_restriction, 1, 1),
  new WCPTopping("Hot Giardiniera", "giard", 2, idx++, no_restriction, 1, 1),
  new WCPTopping("Sport Pepper", "sport", 2, idx++, no_restriction, 1, 1),

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
    if (pizza.crust.shortname === crusts.regular.shortname && pizza.sauce.shortname === "red") {
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
    var shortname_components = {sauce: null, cheese: null, dough: null, crust: null};
    var name_components = {sauce: null, cheese: null, dough: null, crust: null};
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

      // set byo flag
      pizza.is_byo = menu_match[0] === pizza_menu["byo"] || menu_match[1] === pizza_menu["byo"];

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

      function BuildComponentsList(source, getter) {
        var lst = [];
        if (source.sauce) {
          lst.push(getter(source.sauce));
        }
        if (source.dough) {
          lst.push(getter(source.dough));
        }
        if (source.crust) {
          lst.push(getter(source.crust));
        }
        if (source.cheese) {
          lst.push(getter(source.cheese));
        }
        return lst.concat(additional_toppings.whole.map(function(x) { return getter(x); }));
      }

      var name_components_list = null;
      var shortname_components_list = null;
      if (pizza.is_split) {
        name_components_list = BuildComponentsList(name_components, function(x) { return x.name; });
        shortname_components_list = BuildComponentsList(shortname_components, function(x) { return x.shortname; });
        if (menu_match[0].name == menu_match[1].name) {
          if (menu_match[0] !== pizza_menu["byo"]) {
            name_components_list.unshift(menu_match[0].name);
            shortname_components_list.unshift(menu_match[0].name);
          }
          name_components_list.push("(" + split_toppings.join(" | ") + ")");
          shortname_components_list.push("(" + short_split_toppings.join(" | ") + ")");
        }
        else {
          var names = [(menu_match[0] !== pizza_menu["byo"]) ? [menu_match[0].name] : [], (menu_match[1] !== pizza_menu["byo"]) ? [menu_match[1].name] : []];
          var shortnames = [names[0], names[1]];
          if (additional_toppings.left.length) {
            names[0] = names[0].concat(split_toppings[0]);
            shortnames[0] = shortnames[0].concat(short_split_toppings[0]);
          }
          if (additional_toppings.right.length) {
            names[1] = names[1].concat(split_toppings[1]);
            shortnames[1] = shortnames[1].concat(short_split_toppings[1]);
          }
          names[0].length ? 0 : names[0].push("∅");
          names[1].length ? 0 : names[1].push("∅");
          name_components_list.push("(" + names[0].join(" + ") + " | " + names[1].join(" + ") + ")");
          shortnames[0].length ? 0 : shortnames[0].push("∅");
          shortnames[1].length ? 0 : shortnames[1].push("∅");
          shortname_components_list.push("(" + shortnames[0].join(" + ") + " | " + shortnames[1].join(" + ") + ")");
        }
      }
      else if (menu_match[0] === pizza_menu["byo"]) {
        // we've got a build your own pizza, make sure sauce and cheese name components are present
        name_components.sauce = name_components.sauce !== null ? name_components.sauce : menu_match[0].sauce;
        name_components.cheese = name_components.cheese !== null ? name_components.cheese : cheese_options[menu_match[0].cheese_option];
        name_components_list = BuildComponentsList(name_components, function(x) { return x.name; });
        shortname_components_list = BuildComponentsList(shortname_components, function(x) { return x.shortname; });
      }
      else {
        name_components_list = BuildComponentsList(name_components, function(x) { return x.name; });
        shortname_components_list = BuildComponentsList(shortname_components, function(x) { return x.shortname; });
        name_components_list.unshift(menu_match[0].name);
        shortname_components_list.unshift(menu_match[0].name);
      }
      pizza.name = name_components_list.join(" + ");
      pizza.shortname = shortname_components_list.length === 0 ? "cheese" : shortname_components_list.join(" + ");
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
  this.shortname = "undef";
  this.is_byo = false;
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
    crusts.regular,
    "regular",
    sauces.red,
    [[TOPPING_WHOLE, toppings_dict.pepperoni],
    [TOPPING_WHOLE, toppings_dict.sausage],
    [TOPPING_WHOLE, toppings_dict.carm_onion],
    [TOPPING_WHOLE, toppings_dict.spin],
    [TOPPING_WHOLE, toppings_dict.garlic]]
  ),
  mamma_mia: new WCPPizza("Mamma Mia",
    "A",
    crusts.regular,
    "regular",
    sauces.red,
    [[TOPPING_WHOLE, toppings_dict.sport],
    [TOPPING_WHOLE, toppings_dict.meatball],
    [TOPPING_WHOLE, toppings_dict.garlic]]
  ),

  four_pepper: new WCPPizza("4 Pepper",
    "F",
    crusts.regular,
    "regular",
    sauces.red,
    [[TOPPING_WHOLE, toppings_dict.rbp],
    [TOPPING_WHOLE, toppings_dict.greenbp],
    [TOPPING_WHOLE, toppings_dict.shp],
    [TOPPING_WHOLE, toppings_dict.jala],
    [TOPPING_WHOLE, toppings_dict.garlic]]
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
    crusts.regular,
    "regular",
    sauces.red,
    [[TOPPING_WHOLE, toppings_dict.sausage],
    [TOPPING_WHOLE, toppings_dict.pine],
    [TOPPING_WHOLE, toppings_dict.jala],
    [TOPPING_WHOLE, toppings_dict.garlic]]
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
  beets: new WCPSalad("Beets By Schrute Salad",
    "Be",
    7,
    "Arugula + Roasted Beet + Roasted Pistachio + Bleu + Tarragon Vinaigrette"
  ),
  caesar: new WCPSalad("All Kale Caesar! Salad",
    "Cz",
    7,
    "Marinated Kale + Parmigiano Reggiano + Caesar Dressing + Garlic Crouton + Lemon Wedge"
  ),
  polpetta: new WCPSalad("Polpetta Party",
    "Mb",
    9,
    "House-Made Meatball (8) + Marinara + Toasted Herbed Breadcrumb + Pecorino Romano + Fresh Basil (Please note: To ensure quality, to-go orders for this item will be prepared upon guest arrival, which will take 6-7 minutes.)"
  )	
};


beverage_menu = {
  citraipa: new WCPSalad("Stoup - Citra IPA Crowler",
    "StCit",
    14,
    "Images of tropical fruit and citrus thanks to a healthy dose of Citra® hops - ABV 5.9% - IBU 50 - 32oz"
  ),
  pistolipa: new WCPSalad("Stoup - Pistol Fingers IPA Crowler",
    "StPis",
    14,
    "Resonate, Pellets and Cryo pellets in this homage to the mighty Mosaic hop. - ABV 6.9% - IBU 75 - 32oz"
  ),
  whitelodge: new WCPSalad("Holy Mountain - White Lodge Wit Crowler",
    "HMWit",
    14,
    "Belgian-Style Witbier wih pilsner malt and oats and fermented with a traditional Belgian strain. ABV 4.8% - 32oz"
  ),
  blackbeer: new WCPSalad("Holy Mountain - Black Beer Crowler",
    "HMBlk",
    14,
    "Session black ale brewed with roasted and flaked barley and hopped with East Kent Golding. ABV 4.5% - 32oz"
  ),
  witherer: new WCPSalad("Holy Mountain - Witherer Crowler",
    "HMWitherer",
    14,
    "Coconut Session Porter brewed with a special variety of British Two Row, and a variety of specialty dark crystal and roasted malts. - ABV 5% - 32oz"
  ),
  lowdrone: new WCPSalad("Holy Mountain - Low Drone Crowler",
    "HMLow",
    14,
    "Hoppy Lager brewed with a combination of German Pilsner Malt and Malted Wheat. Hopped entirely with whole-leaf Citra and Strata during the boil. ABV 5.4% - 32oz"
  ),
  altarpiece: new WCPSalad("Holy Mountain - Altarpiece Crowler",
    "HMAlt",
    14,
    "American Pale Ale with aromas and flavors of citrus, tropical fruit, peach, and hints of sticky pine. ABV 5.2% - 32oz"
  ),
  oly6pk: new WCPSalad("Olympia Tall Boy 6 Pack",
    "Oly6pk",
    11,
    "It's the water, y'all. ABV 4.78% - 6 x 16oz"
  ),
  oly1pk: new WCPSalad("Olympia Tall Boy",
    "Oly1pk",
    3,
    "It's the water, y'all. ABV 4.78% - 16oz"
  ),
  zitrone4k: new WCPSalad("Stiegel Zitrone Radler Tall Boy - 4 x 16",
    "StZitrone4pk",
    11,
    "Summer in a glass... err can. ABV 2.0% - 4 x 16.9oz"
  ),
  moderntms4pk: new WCPSalad("Stiegel Zitrone Radler Tall Boy - 4 x 16",
    "ModernTms4pk",
    14,
    "FILL ME OUT. ABV 2.0% - 4 x 16.9oz"
  ),
  	
};

beverage_menu = {
  citraipa: new WCPSalad("Stoup - Citra IPA Crowler",
    "StCit",
    14,
    "Images of tropical fruit and citrus thanks to a healthy dose of Citra® hops - ABV 5.9% - IBU 50 - 32oz"
  ),
  pistolipa: new WCPSalad("Stoup - Pistol Fingers IPA Crowler",
    "StPis",
    14,
    "Resonate, Pellets and Cryo pellets in this homage to the mighty Mosaic hop. - ABV 6.9% - IBU 75 - 32oz"
  ),
  whitelodge: new WCPSalad("Holy Mountain - White Lodge Wit Crowler",
    "HMWit",
    14,
    "Belgian-Style Witbier wih pilsner malt and oats and fermented with a traditional Belgian strain. ABV 4.8% - 32oz"
  ),
  blackbeer: new WCPSalad("Holy Mountain - Black Beer Crowler",
    "HMBlk",
    14,
    "Session black ale brewed with roasted and flaked barley and hopped with East Kent Golding. ABV 4.5% - 32oz"
  ),
  witherer: new WCPSalad("Holy Mountain - Witherer Crowler",
    "HMWitherer",
    14,
    "Coconut Session Porter brewed with a special variety of British Two Row, and a variety of specialty dark crystal and roasted malts. - ABV 5% - 32oz"
  ),
  lowdrone: new WCPSalad("Holy Mountain - Low Drone Crowler",
    "HMLow",
    14,
    "Hoppy Lager brewed with a combination of German Pilsner Malt and Malted Wheat. Hopped entirely with whole-leaf Citra and Strata during the boil. ABV 5.4% - 32oz"
  ),
  altarpiece: new WCPSalad("Holy Mountain - Altarpiece Crowler",
    "HMAlt",
    14,
    "American Pale Ale with aromas and flavors of citrus, tropical fruit, peach, and hints of sticky pine. ABV 5.2% - 32oz"
  )	
};

extras_menu = {
  small_plates: { 
    menu_name: "Small plates", 
    menu: salad_menu
  },
  growler_fills: { 
    menu_name: "Growler Fills", 
    menu: growler_fill_menu
  },
  beer: { 
    menu_name: "Packaged beer (crowlers, cans, bottles)", 
    menu: beverage_menu
  },
  wine_bottles: { 
    menu_name: "Bottled wine (750mL)", 
    menu: wine_bottles_menu
  },
}