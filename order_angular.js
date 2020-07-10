var TOPPING_NONE = 0;
var TOPPING_LEFT = 1;
var TOPPING_RIGHT = 2;
var TOPPING_WHOLE = 3;
var FLAVOR_MAX = 5;
var BAKE_MAX = 5;

var WCPOption = function (name, shortname, price) {
  this.name = name;
  this.shortname = shortname;
  this.price = price;
  // should enable filter live here?
};

var WCPSauce = function (name, shortname, price, enable_filter) {
  WCPOption.call(this, name, shortname, price);
  this.enable = enable_filter;
  this.ShowOption = function (pizza, MENU) {
    return pizza && (this.enable(pizza, MENU) || pizza.sauce == this.shortname);
  };
};

var WCPCheese = function (name, shortname, price, enable_filter) {
  WCPOption.call(this, name, shortname, price);
  this.enable = enable_filter;
  this.ShowOption = function (pizza, MENU) {
    return pizza && (this.enable(pizza, MENU) || pizza.cheese_option == this.shortname);
  };
};

var WCPProduct = function (name, shortcode, price) {
  this.name = name;
  this.shortcode = shortcode;
  this.price = price;
};

var WCPSalad = function (name, shortcode, price, description) {
  WCPProduct.call(this, name, shortcode, price);
  this.description = description;
};

var WCPTopping = function (name, shortname, price, index, enable_filter, flavor_factor, bake_factor) {
  WCPOption.call(this, name, shortname, price);
  this.index = index;
  this.enable = enable_filter;
  this.flavor_factor = flavor_factor;
  this.bake_factor = bake_factor;
  this.ShowOption = function (pizza, location, MENU) {
    var base = pizza && this.enable(pizza, MENU);
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

var ENABLE_FUNCTIONS = {
  never: function (pizza, MENU) {
    return false;
  },
  always: function (pizza, MENU) {
    return true;
  },
  enable_on_white: function (pizza, MENU) {
    return pizza && pizza.sauce.shortname == "white";
  },
  disable_on_brussels_sprout: function (pizza, MENU) {
    return pizza && pizza.toppings_tracker[MENU.toppings_dict.brussels.index] > 0 ? false : true;
  },
  disable_on_meatball: function (pizza, MENU) {
    return pizza && pizza.toppings_tracker[MENU.toppings_dict.meatball.index] > 0 ? false : true;
  },
  disable_on_chicken_sausage: function (pizza, MENU) {
    return pizza && pizza.toppings_tracker[MENU.toppings_dict.chix.index] > 0 ? false : true;
  },
  disable_on_pork_sausage: function (pizza, MENU) {
    return pizza && pizza.toppings_tracker[MENU.toppings_dict.sausage.index] > 0 ? false : true;
  },
  disable_on_dairy: function (pizza, MENU) {
    return (pizza && pizza.toppings_tracker[MENU.toppings_dict.meatball.index] > 0 ? false : true) && pizza.sauce.shortname != "white" && (pizza.toppings_tracker[MENU.toppings_dict.bleu.index] > 0 ? false : true);
  },
  disable_on_vegan: function (pizza, MENU) {
    return pizza && pizza.cheese_option.shortname != "vegan_chz";
  }
};

var WCPPizza = function (name, shortcode, cheese, sauce, toppings, menu) {
  WCPProduct.call(this, name, shortcode, 0);
  // topping enum is 0: none, 1: left, 2: right, 3: both
  // toppings is array<tuple<enum, topping>>
  function ComputePrice(pizza, MENU) {
    var val = 19;
    val = val + pizza.cheese_option.price;
    val = val + pizza.sauce.price;
    for (var i in pizza.toppings_tracker) {
      if (pizza.toppings_tracker[i] > 0) {
        val = val + MENU.toppings[i].price;
      }
    }
    return val;
  }
  function RecomputeToppingsMetadata(pizza, MENU) {
    var addon_chz = 0;//pizza.cheese_option != cheese_options['regular'].shortname ? 1 : 0;
    pizza.bake_count = [addon_chz, addon_chz];
    pizza.flavor_count = [0, 0];
    pizza.is_split = false;
    for (var i in pizza.toppings_tracker) {
      var topping = pizza.toppings_tracker[i];
      if (topping == TOPPING_LEFT || topping == TOPPING_WHOLE) {
        pizza.bake_count[0] = pizza.bake_count[0] + MENU.toppings[i].bake_factor;
        pizza.flavor_count[0] = pizza.flavor_count[0] + MENU.toppings[i].flavor_factor;
      }
      if (topping == TOPPING_RIGHT || topping == TOPPING_WHOLE) {
        pizza.bake_count[1] = pizza.bake_count[1] + MENU.toppings[i].bake_factor;
        pizza.flavor_count[1] = pizza.flavor_count[1] + MENU.toppings[i].flavor_factor;
      }
      pizza.is_split = pizza.is_split || topping == TOPPING_LEFT || topping == TOPPING_RIGHT;
    }
  }

  function GetSauceCheeseList(pizza, getter, verbose, MENU) {
    var ret = [];
    if (verbose || pizza.sauce.shortname != MENU.sauces.red.shortname) {
      ret.push(getter(pizza.sauce));
    }
    if (verbose || pizza.cheese_option.shortname != MENU.cheeses.regular.shortname) {
      ret.push(getter(pizza.cheese_option));
    }
    return ret;
  }

  function BuildCustomShortcode(pizza) {
    var shortcode_builder = "";
    if (pizza.sauce.shortname === "red") {
      shortcode_builder = "z";
    }
    if (pizza.sauce.shortname === "white") {
      shortcode_builder = shortcode_builder + "w";
    }
    return shortcode_builder;
  }

  // begin member functions
  this.GenerateToppingsList = function (TOPPINGS_ARRAY) {
    // generates and returns a topping list for use by the constructor or something iterating over the toppings
    var new_toppings_list = [];
    for (var i in this.toppings_tracker) {
      if (this.toppings_tracker[i] > 0) {
        new_toppings_list.push([this.toppings_tracker[i], TOPPINGS_ARRAY[i]]);
      }
    }
    return new_toppings_list;
  };

  this.SplitToppingsList = function () {
    // generates three lists ordered from top to bottom: whole toppings, left only toppings, right only toppings
    var ret = { left: [], right: [], whole: [] };
    for (var i in this.toppings_tracker) {
      switch (this.toppings_tracker[i]) {
        case TOPPING_LEFT: ret.left.push(i); break;
        case TOPPING_RIGHT: ret.right.push(i); break;
        case TOPPING_WHOLE: ret.whole.push(i);
      }
    }
    return ret;
  };

  this.DisplayToppings = function (MENU) {
    var split_toppings = this.SplitToppingsList();
    var toppings_sections = [];

    //whole toppings begin
    var whole_toppings = split_toppings.whole.map(function (x) { return MENU.toppings[x].name; });
    var sauce_cheese = GetSauceCheeseList(this, function (x) { return x.name; }, true, MENU);
    whole_toppings = sauce_cheese.concat(whole_toppings);
    toppings_sections.push(["Whole", whole_toppings.join(" + ")]);
    //whole toppings end

    //split toppings begin
    if (this.is_split) {
      if (split_toppings.left.length > 0) {
        toppings_sections.push(["Left", split_toppings.left.map(function (x) { return MENU.toppings[x].name; }).join(" + ")]);
      }
      if (split_toppings.right.length > 0) {
        toppings_sections.push(["Right", split_toppings.right.map(function (x) { return MENU.toppings[x].name; }).join(" + ")]);
      }
    }
    //split toppings end
    return toppings_sections;
  };

  this.OneLineDisplayToppings = function () {
    var split_toppings = this.SplitToppingsList();
    var sections = [];
    sections.push(GetSauceCheeseList(this, function (x) { return x.name; }, true, MENU).join(" + "));

    var whole_toppings = split_toppings.whole.map(function (x) { return MENU.toppings[x].name; });
    if (whole_toppings.length > 0) {
      sections.push(whole_toppings.join(" + "));
    }
    if (this.is_split) {
      var left = split_toppings.left.length > 0 ? split_toppings.left.map(function (x) { return MENU.toppings[x].name; }).join(" + ") : "∅";
      var right = split_toppings.right.length > 0 ? split_toppings.right.map(function (x) { return MENU.toppings[x].name; }).join(" + ") : "∅";
      sections.push("(" + [left, right].join(" | ") + ")");
    }
    return sections.join(" + ");
  };

  Compare = function (first, other) {
    // 0 no match
    // 1 at least
    // 2 exact match
    var sauce_match = first.sauce.shortname == other.sauce.shortname ? 2 : 1;
    var cheese_match = first.cheese_option.shortname === other.cheese_option.shortname ? 2 : (other.cheese_option.shortname === "regular" ? 1 : 0);
    var toppings_match = [[], []];
    var non_topping_match = Math.min(sauce_match, cheese_match);
    var is_mirror = first.is_split && other.is_split && non_topping_match == 2;
    for (var i in other.toppings_tracker) {
      switch (other.toppings_tracker[i]) {
        case 0:
          switch (first.toppings_tracker[i]) {
            case 0: toppings_match[0].push(2); toppings_match[1].push(2); break;
            case 1: toppings_match[0].push(1); toppings_match[1].push(2); is_mirror = false; break;
            case 2: toppings_match[0].push(2); toppings_match[1].push(1); is_mirror = false; break;
            case 3: toppings_match[0].push(1); toppings_match[1].push(1); is_mirror = false; break;
            default: console.assert(false, "invalid topping value");
          }
          break;
        case 1:
          switch (first.toppings_tracker[i]) {
            case 0: toppings_match[0].push(0); toppings_match[1].push(2); is_mirror = false; break;
            case 1: toppings_match[0].push(2); toppings_match[1].push(2); is_mirror = false; break;
            case 2: toppings_match[0].push(0); toppings_match[1].push(0); break;
            case 3: toppings_match[0].push(2); toppings_match[1].push(1); is_mirror = false; break;
            default: console.assert(false, "invalid topping value");
          }
          break;
        case 2:
          switch (first.toppings_tracker[i]) {
            case 0: toppings_match[0].push(2); toppings_match[1].push(0); is_mirror = false; break;
            case 1: toppings_match[0].push(0); toppings_match[1].push(0); break;
            case 2: toppings_match[0].push(2); toppings_match[1].push(2); is_mirror = false; break;
            case 3: toppings_match[0].push(1); toppings_match[1].push(2); is_mirror = false; break;
            default: console.assert(false, "invalid topping value");
          }
          break;
        case 3:
          switch (first.toppings_tracker[i]) {
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
      cheese: cheese_match,
      toppings: toppings_match,
      mirror: is_mirror,
      min_non_topping: non_topping_match,
      min_topping_left: Math.min.apply(null, toppings_match[0]),
      min_topping_right: Math.min.apply(null, toppings_match[1])
    };
  };

  IsEquals = function (a, b) {
    var comparison_info = Compare(a, b);
    return comparison_info.mirror || (comparison_info.min_non_topping == 2 && comparison_info.min_topping_left == 2 && comparison_info.min_topping_right == 2);
  }

  this.Equals = function (other) {
    return IsEquals(this, other);
  };

  this.RecomputeName = function (MENU) {
    // TODO: this logic lacks elegance. Fix that.
    var byo_shortcode = BuildCustomShortcode(this);
    var shortcodes = [byo_shortcode, byo_shortcode];
    var menu_match = [null, null];
    var shortname_components = { sauce: null, cheese: null, };
    var name_components = { sauce: null, cheese: null };
    var toppings_name_tracker = [];
    for (var i in MENU.toppings) {
      toppings_name_tracker.push([0, 0]);
    }

    function ComputeForSide(pizza, idx, comparison, menu_compare) {
      if (menu_match[idx] !== null) {
        return;
      }
      switch (comparison) {
        case 2: // exact match
          menu_match[idx] = MENU.pizzas[menu_compare];
          shortcodes[idx] = MENU.pizzas[menu_compare].shortcode;
          break;
        case 1: // at least other
          // menu pizza with add-ons

          // first pull out any sauce, cheese differences
          if (menu_compare === "z") {
            name_components.sauce = pizza.sauce;
            name_components.cheese = pizza.cheese_option;
          }
          if (comparison_info.sauce === 1) {
            shortname_components.sauce = name_components.sauce = pizza.sauce;
          }
          if (comparison_info.cheese === 1) {
            shortname_components.cheese = name_components.cheese = pizza.cheese_option;
          }

          // determine what toppings are additions for the matching pizza
          for (var i in comparison_info.toppings[idx]) {
            if (comparison_info.toppings[idx][i] === 1) {
              toppings_name_tracker[i][idx] = 1;
            }
          }
          menu_match[idx] = MENU.pizzas[menu_compare];
          break;
        default: // no match, no need to create any name
      }
    }

    function BuildName(pizza) {
      console.assert(menu_match[0] !== null && menu_match[1] !== null, "We should have both names determined by now.");
      // assign shortcode (easy)
      pizza.shortcode = pizza.is_split && shortcodes[0] !== shortcodes[1] ? shortcodes.join("|") : shortcodes[0];

      // set byo flag
      pizza.is_byo = IsEquals(menu_match[0], MENU.pizzas["z"]) || IsEquals(menu_match[1], MENU.pizzas["z"]);

      // split out toppings into left additions, right additions, and whole additions
      var additional_toppings = { left: [], right: [], whole: [] };
      for (var i in toppings_name_tracker) {
        if (toppings_name_tracker[i][0] === 1 && toppings_name_tracker[i][1] === 1) {
          additional_toppings.whole.push(MENU.toppings[i]);
        }
        else if (toppings_name_tracker[i][0] === 1 && toppings_name_tracker[i][1] === 0) {
          additional_toppings.left.push(MENU.toppings[i]);
        }
        else if (toppings_name_tracker[i][0] === 0 && toppings_name_tracker[i][1] === 1) {
          additional_toppings.right.push(MENU.toppings[i]);
        }
      }
      var split_toppings = ["∅", "∅"];
      var short_split_toppings = ["∅", "∅"];
      if (additional_toppings.left.length) {
        split_toppings[0] = additional_toppings.left.map(function (x) { return x.name; }).join(" + ");
        short_split_toppings[0] = additional_toppings.left.map(function (x) { return x.shortname; }).join(" + ");
      }
      if (additional_toppings.right.length) {
        split_toppings[1] = additional_toppings.right.map(function (x) { return x.name; }).join(" + ");
        short_split_toppings[1] = additional_toppings.right.map(function (x) { return x.shortname; }).join(" + ");
      }

      function BuildComponentsList(source, getter) {
        var lst = [];
        if (source.sauce) {
          lst.push(getter(source.sauce));
        }
        if (source.cheese) {
          lst.push(getter(source.cheese));
        }
        return lst.concat(additional_toppings.whole.map(function (x) { return getter(x); }));
      }

      var name_components_list = null;
      var shortname_components_list = null;
      if (pizza.is_split) {
        name_components_list = BuildComponentsList(name_components, function (x) { return x.name; });
        shortname_components_list = BuildComponentsList(shortname_components, function (x) { return x.shortname; });
        if (menu_match[0].name === menu_match[1].name) {
          if (menu_match[0] !== MENU.pizzas["z"]) {
            name_components_list.unshift(menu_match[0].name);
            shortname_components_list.unshift(menu_match[0].name);
          }
          name_components_list.push("(" + split_toppings.join(" | ") + ")");
          shortname_components_list.push("(" + short_split_toppings.join(" | ") + ")");
        }
        else {
          var names = [IsEquals(menu_match[0] !== MENU.pizzas["z"]) ? [menu_match[0].name] : [], IsEquals(menu_match[1] !== MENU.pizzas["z"]) ? [menu_match[1].name] : []];
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
      else if (IsEquals(menu_match[0], MENU.pizzas["z"])) {
        // we've got a build your own pizza, make sure sauce and cheese name components are present
        name_components.sauce = name_components.sauce !== null ? name_components.sauce : menu_match[0].sauce;
        name_components.cheese = name_components.cheese !== null ? name_components.cheese : menu_match[0].cheese_option;
        name_components_list = BuildComponentsList(name_components, function (x) { return x.name; });
        shortname_components_list = BuildComponentsList(shortname_components, function (x) { return x.shortname; });
      }
      else {
        name_components_list = BuildComponentsList(name_components, function (x) { return x.name; });
        shortname_components_list = BuildComponentsList(shortname_components, function (x) { return x.shortname; });
        name_components_list.unshift(menu_match[0].name);
        shortname_components_list.unshift(menu_match[0].name);
      }
      pizza.name = name_components_list.join(" + ");
      pizza.shortname = shortname_components_list.length === 0 ? "cheese" : shortname_components_list.join(" + ");
    }

    // iterate through menu, until has_left and has_right are true
    // a name can be assigned once an exact or at least match is found for a given side
    for (var menu_pizza in MENU.pizzas) {
      var comparison_info = Compare(this, MENU.pizzas[menu_pizza]);
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

  this.UpdatePie = function (MENU) {
    this.price = ComputePrice(this, MENU);
    RecomputeToppingsMetadata(this, MENU);
    this.RecomputeName(MENU);
    this.toppings_sections = this.DisplayToppings(MENU);
  };

  this.ToDTO = function (MENU) {
    return {
      name: this.name,
      shortname: this.shortname,
      shortcode: this.shortcode,
      cheese: this.cheese_option.shortname,
      sauce: this.sauce.shortname,
      toppings: this.GenerateToppingsList(MENU.toppings).map(function (x) { return [x[0], x[1].shortname]; })
    };
  };

  // begin initialization
  this.cheese_option = cheese;
  this.sauce = sauce;
  this.toppings_tracker = [];
  this.is_split = false;
  this.toppings_sections = [];
  this.bake_count = [0, 0];
  this.flavor_count = [0, 0];
  this.shortname = "undef";
  this.is_byo = false;
  for (var i in menu.toppings) {
    this.toppings_tracker.push(TOPPING_NONE);
  }
  for (var j in toppings) {
    this.toppings_tracker[toppings[j][1].index] = toppings[j][0];
  }
  this.UpdatePie(menu);
  // end initialization
};

function WCPPizzaFromDTO(dto, MENU) {
  return new WCPPizza(dto.name, dto.shortcode, MENU.cheeses[dto.cheese], MENU.sauces[dto.sauce], dto.toppings.map(function (x) { return [x[0], MENU.toppings_dict[x[1]]] }), MENU);
}


function GenerateCatalogMapFromCatalog(cat, $sce) {
  function GetModifierObjectsFromDicts(mod, indexed) {
    var opts = [];
    var has_disabled = false;
    var mt = cat.modifiers[mod.modifier_type_id];
    mod.options.forEach(function (opt) {
      var idx;
      for (idx = 0; idx < mt.options.length; ++idx) {
        if (mt.options[idx]._id === opt.option_id) {
          if (mt.options[idx].catalog_item.disabled) {
            has_disabled = true;
          }
          break;
        }
      }
      opts.push(indexed[mod.modifier_type_id][mt.options[idx].catalog_item.shortcode])
    })
    return [has_disabled, opts];
  }
  console.log(cat);
  var menu = {
    extras: [],
    pizzas: {},
    toppings: [],
    toppings_dict: {},
    sauces: {},
    cheeses: {}
  };
  var mod_dicts = {};

  // first pull toppings
  mod_dicts[TOPPINGS_MTID] = {};
  var opt_index = 0;
  cat.modifiers[TOPPINGS_MTID].options.sort(function (a, b) { return a.ordinal - b.ordinal }).forEach(function (opt) {
    if (!opt.catalog_item.disabled) {
      var enable_function = ENABLE_FUNCTIONS[opt.enable_function_name];
      var top = new WCPTopping(opt.catalog_item.display_name, opt.catalog_item.shortcode, opt.catalog_item.price.amount / 100, opt_index, enable_function, opt.metadata.flavor_factor, opt.metadata.bake_factor);
      menu.toppings.push(top);
      mod_dicts[TOPPINGS_MTID][opt.catalog_item.shortcode] = top;
      ++opt_index;
    }
  })
  menu.toppings_dict = mod_dicts[TOPPINGS_MTID];
  
  mod_dicts[CHEESE_MTID] = {};
  cat.modifiers[CHEESE_MTID].options.sort(function (a, b) { return a.ordinal - b.ordinal }).forEach(function (opt) {
    if (!opt.catalog_item.disabled) {
      var enable_function = ENABLE_FUNCTIONS[opt.enable_function_name];
      mod_dicts[CHEESE_MTID][opt.catalog_item.shortcode] = new WCPCheese(opt.catalog_item.display_name, opt.catalog_item.shortcode, opt.catalog_item.price.amount / 100, enable_function);
    }
  })
  menu.cheeses = mod_dicts[CHEESE_MTID];

  mod_dicts[SAUCE_MTID] = {};
  cat.modifiers[SAUCE_MTID].options.sort(function (a, b) { return a.ordinal - b.ordinal }).forEach(function (opt) {
    if (!opt.catalog_item.disabled) {
      var enable_function = ENABLE_FUNCTIONS[opt.enable_function_name];
      mod_dicts[SAUCE_MTID][opt.catalog_item.shortcode] = new WCPSauce(opt.catalog_item.display_name, opt.catalog_item.shortcode, opt.catalog_item.price.amount / 100, enable_function);
    }
  });
  menu.sauces = mod_dicts[SAUCE_MTID];

  //TODO need to sort categories by ordinal
  cat.categories[EXTRAS_CATID].children.sort(function (a, b) { return cat.categories[a].category.ordinal - cat.categories[b].category.ordinal; }).forEach(function (subcat) {
    var computed_submenu = [];
    var wario_extras_for_subcat = cat.categories[subcat].products;
    wario_extras_for_subcat.forEach(function (pid) {
      if (!cat.products[pid].product.item.disabled) {
        cat.products[pid].instances.forEach(function (product_instance) {
          var is_disabled = product_instance.item.disabled;
          if (!is_disabled) {
            computed_submenu.push([product_instance.ordinal, new WCPSalad(product_instance.item.display_name, product_instance.item.shortcode, product_instance.item.price.amount / 100, product_instance.item.description)]);
          }
        });
      }
    });
    if (computed_submenu.length) {
      var computed_submenu_map = {};
      computed_submenu.sort(function (a, b) { return a[0] - b[0] }).forEach(function (itm) {
        computed_submenu_map[itm[1].shortcode] = itm[1];
      })
      menu.extras.push({
        menu_name: cat.categories[subcat].category.description ? $sce.trustAsHtml(cat.categories[subcat].category.description) : cat.categories[subcat].category.name,
        subtitle: cat.categories[subcat].category.subheading ? $sce.trustAsHtml(cat.categories[subcat].category.subheading) : null,
        menu: Object.values(computed_submenu_map)
      });
    }
  });


  var wario_pizza_products = cat.categories[PIZZAS_CATID].products;
  var pizzas_temp = [];
  wario_pizza_products.forEach(function (pid) {
    if (!cat.products[pid].product.item.disabled) {
      cat.products[pid].instances.forEach(function (product_instance) {
        var is_disabled = product_instance.item.disabled;
        var pi_chz = [];
        var pi_sauce = [];
        var pi_toppings = [];
        product_instance.modifiers.forEach(function (mt) {
          var ret = GetModifierObjectsFromDicts(mt, mod_dicts);
          var obj = ret[1];
          is_disabled = is_disabled || ret[0];
          switch (mt.modifier_type_id) {
            case CHEESE_MTID:
              pi_chz = obj[0];
              break;
            case SAUCE_MTID:
              pi_sauce = obj[0];
              break;
            case TOPPINGS_MTID:
              pi_toppings = obj;
              break;
            default:
              console.log("something went wrong!");
          }
        })
        if (!is_disabled) {
          pizzas_temp.push([product_instance.ordinal, new WCPPizza(product_instance.item.display_name, product_instance.item.shortcode, pi_chz, pi_sauce, pi_toppings.map(function (x) { return [TOPPING_WHOLE, x] }), menu)]);
        }
      })
    }
  });
  pizzas_temp.sort(function (a, b) { return a[0] - b[0] }).forEach(function (itm) {
    menu.pizzas[itm[1].shortcode] = itm[1];
  })
  return menu;
}

var $j = jQuery.noConflict();

var EMAIL_REGEX = new RegExp("^[_A-Za-z0-9\-]+(\\.[_A-Za-z0-9\-]+)*@[A-Za-z0-9\-]+(\\.[A-Za-z0-9\-]+)*(\\.[A-Za-z]{2,})$");

var CREDIT_REGEX = new RegExp("[A-Za-z0-9]{3}-[A-Za-z0-9]{2}-[A-Za-z0-9]{3}-[A-Z0-9]{8}$");
var DATE_STRING_INTERNAL_FORMAT = "YYYYMMDD";

var DELIVERY_INTERVAL_TIME = 30;

var SanitizeIfExists = function (str) {
  return str && str.length ? str.replace("'", "`").replace("/", "|").replace("&", "and").replace("<", "").replace(">", "").replace(/[\+\t\r\n\v\f]/g, '') : str;
}

function ScrollTopJQ() {
  $j("html, body").animate({
    scrollTop: $j("#ordertop").offset().top - 150
  }, 500);
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
  this.MENU = {
    extras: [],
    pizzas: {},
    toppings: [],
    toppings_dict: {},
    sauces: {},
    cheeses: {} 
  };
  this.CHEESE_SELECTION_MODE = 2;
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

  this.UpdateCatalog = function (cat, $sce) {
    var catalog_map = GenerateCatalogMapFromCatalog(cat, $sce);
    Object.assign(this.MENU, catalog_map);
    this.CHEESE_SELECTION_MODE = Object.keys(catalog_map.cheeses).length;
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
  var app = angular.module("WCPOrder", ['ngSanitize', 'btford.socket-io']);

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

    this.ClearCredit = function() { 
      this.credit = { 
        code: "",
        validation_successful: false, 
        validation_processing: false,
        validation_fail: false,
        amount: 0.00,
        amount_used: 0.00,
        type: "MONEY",
        encoded: { }
      };
    }
    this.ReinitializeAccordion = function () { 
      this.accordionstate = Array.apply(null, Array(cfg.MENU.extras.length)).map(function (x, i) { return i === 0; });
    }

    this.RecomputeOrderSize = function () {
      var size = 0;
      for (var i in this.cart.pizza) {
        size = size + this.cart.pizza[i][0];
      }
      this.num_pizza = size;
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
      var newtip = parseFloat(Number(this.tip_options[idx] * compute_tip_from).toFixed(2));
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
      this.computed_tax = parseFloat(Number((pre_tax_monies - pre_tax_store_credit) * cfg.TAX_RATE).toFixed(2));
      this.autograt = this.num_pizza >= 5 || this.service_type === cfg.DELIVERY || this.service_type === cfg.DINEIN  ? .2 : 0;
      var compute_tip_from = pre_tax_monies + this.computed_tax;
      var mintip = compute_tip_from * this.autograt;
      mintip = parseFloat(mintip.toFixed(2));
      if (this.tip_clean) {
        this.custom_tip_value = parseFloat(Number(compute_tip_from * .2).toFixed(2));
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
      this.total = parseFloat(this.total.toFixed(2));
      let post_tax_credit_used = 0;
      // TODO: handle case where discount credit is used to apply to tip, adding the value to amount_used almost does it
      if (this.credit.validation_successful && this.credit.type == "MONEY") {
        post_tax_credit_used = Math.min(this.credit.amount, this.total);
        this.credit.amount_used = this.credit.amount_used + post_tax_credit_used;
      }
      this.balance = this.total - post_tax_credit_used - pre_tax_store_credit;
    }

    this.StatePostCartUpdate = function () {
      this.RecomputeOrderSize();
      this.ComputeSubtotal();
      this.TotalsUpdate();
    }

    this.CartToDTO = function() {
      const dto = {
        pizza: this.cart.pizza.map(function(x) { return [x[0], x[1].ToDTO(cfg.MENU)]}),
        extras: this.cart.extras.map(function(x) { return [x[0], { shortcode: x[1].shortcode, name: x[1].name } ]})
      };
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
        url: `${WARIO_ENDPOINT}api/v1/order/new`,
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
          useragent: navigator.userAgent + " FEV5",
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
    this.acknowledge_dine_in_terms = false;
    this.acknowledge_instructions_dialogue = false;
    this.special_instructions = "";
    this.special_instructions_responses = [];
    this.enable_split_toppings = enable_split_toppings;
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
    this.credit = {};
    this.accordionstate = [];

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

  app.controller("OrderController", ["OrderHelper", "$http", "$location", "$rootScope", "$sce", "socket",
    function (OrderHelper, $http, $location, $rootScope, $sce, $socket) {
      this.ORDER_HELPER = OrderHelper;
      this.CONFIG = $rootScope.CONFIG = OrderHelper.cfg;
      var split_toppings = $location.search().split === true;
      var enable_delivery = true;
      this.ScrollTop = ScrollTopJQ;
      this.s = $rootScope.state = new WCPOrderState(this.CONFIG, enable_delivery, split_toppings);

      this.Reset = function () {
        this.s = $rootScope.state = new WCPOrderState(this.CONFIG, enable_delivery, split_toppings);
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

      this.ChangedEscapableInfo = function() {
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
      
      this.RevalidateItems = function () {
        //TODO
      }

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
        this.CONFIG.UpdateCatalog(message, $sce);
        this.s.ReinitializeAccordion();
        this.RevalidateItems();

        this.SlowSubmitterCheck();
        UpdateLeadTime();
      };
      var UpdateCatalogFxn = UpdateCatalogFxn.bind(this);
      $socket.on("WCP_CATALOG", UpdateCatalogFxn);
    }]);

  app.controller("AccordionController", ["$rootScope" , function ($rootScope) {

  }]);

  app.controller("PizzaMenuController", function () {
    this.CONFIG = wcpconfig;
    this.selection = null;
    this.quantity = 1;
    this.cheese_toggle = false;
    this.messages = [];
    this.suppress_guide = false;

    this.PopulateOrderGuide = function () {
      var addon_chz = this.selection.cheese_option != this.CONFIG.MENU.cheeses.regular.shortname ? 1 : 0;
      this.messages = [];
      if (this.selection) {
        if (this.selection.bake_count[0] + addon_chz < 2 || this.selection.bake_count[1] + addon_chz < 2) {
          this.messages.push("Our pizza is designed as a vehicle for add-ons. We recommend at least two toppings to weigh the crust down during baking. If this is your first time dining with us, we'd suggest ordering a menu pizza without modifications.");
        }
        if (this.selection.flavor_count[0] > 5 || this.selection.flavor_count[1] > 5) {
          this.messages.push("We love our toppings too, but adding this many flavors can end up detracting from the overall enjoyment. We'd suggest scaling this pizza back a bit. If this is your first time dining with us, we'd suggest ordering a menu pizza without modifications.");
        }
        if (this.selection.sauce == this.CONFIG.MENU.sauces.white && this.selection.toppings_tracker[this.CONFIG.MENU.toppings_dict.bleu.index] != TOPPING_NONE) {
          this.messages.push("Our white sauce really lets the bleu cheese flavor come through. If you haven't had this pairing before, we'd suggest asking for light bleu cheese or switching back to red sauce.");
        }
      }
    };

    this.updateSelection = function () {
      if (this.CONFIG.CHEESE_SELECTION_MODE === 2) {
        this.selection.cheese_option = this.cheese_toggle ? this.CONFIG.MENU.cheeses.ex_chz : this.CONFIG.MENU.cheeses.regular;
      }
      this.selection.UpdatePie(this.CONFIG.MENU);
      this.PopulateOrderGuide();
    };

    this.setPizza = function (selectedPizza) {
      this.selection = WCPPizzaFromDTO(selectedPizza.ToDTO(this.CONFIG.MENU), this.CONFIG.MENU);
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
          // commenting this out as i don't think it's needed this.selection.UpdatePie(this.pmenuctrl.CONFIG.MENU);
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
      template: '<input id="{{ctrl.topping.shortname}}_whole" class="input-whole" ng-model="ctrl.whole" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.WHOLE, ctrl.pmenuctrl.CONFIG.MENU)" type="checkbox" ng-change="ctrl.ToggleWhole()">' +
        '<input ng-show="ctrl.split" id="{{ctrl.topping.shortname}}_left" class="input-left"  ng-model="ctrl.left" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.LEFT, ctrl.pmenuctrl.CONFIG.MENU)" type="checkbox" ng-change="ctrl.ToggleHalf()">' +
        '<input ng-show="ctrl.split" id="{{ctrl.topping.shortname}}_right" class="input-right" ng-model="ctrl.right" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.RIGHT, ctrl.pmenuctrl.CONFIG.MENU)" type="checkbox" ng-change="ctrl.ToggleHalf()">' +
        '<span class="option-circle-container">' +
        '<label for="{{ctrl.topping.shortname}}_whole" class="option-whole option-circle"></label>' +
        '<label ng-show="ctrl.split" for="{{ctrl.topping.shortname}}_left" class="option-left option-circle"></label>' +
        '<label ng-show="ctrl.split" for="{{ctrl.topping.shortname}}_right" class="option-right option-circle"></label>' +
        '</span>' +
        '<label class="topping_text" for="{{ctrl.topping.shortname}}_whole" ng-disabled="!ctrl.topping.ShowOption(ctrl.selection, ctrl.config.WHOLE, ctrl.pmenuctrl.CONFIG.MENU)">{{ctrl.topping.name}}</label>'
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