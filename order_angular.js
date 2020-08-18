// TODO: must add polyfill JS
function GetPlacementFromMIDOID(pi, mid, oid) {
  var option_placement = pi.modifiers.hasOwnProperty(mid) ?
    pi.modifiers[mid].find(function (x) { return x[1] === oid }) : null;
  return option_placement ? option_placement[0] : TOPPING_NONE;
}

function DisableDataCheck(disable_data) {
  // TODO: this should not be the current time, but rather the time the order is FOR
  return !disable_data || (!(disable_data.start > disable_data.end) && (disable_data.start > moment().valueOf() || disable_data.end < moment().valueOf()));
}

// TODO: refactor these! they need to use the product.modifiers list and use mtid, moid and basically be defined in WARIO itself
var ENABLE_FUNCTIONS = {
  never: function (pi, location, MENU) {
    return false;
  },
  always: function (pi, location, MENU) {
    return true;
  },
  enable_on_white: function (pi, location, MENU) {
    return GetPlacementFromMIDOID(pi, SAUCE_MTID, SAUCE_WHITE_OID) != TOPPING_NONE;
  },
  disable_on_brussels_sprout: function (pi, location, MENU) {
    return GetPlacementFromMIDOID(pi, TOPPINGS_MTID, TOPPING_BRUSSELS_OID) === TOPPING_NONE;
  },
  disable_on_meatball: function (pi, location, MENU) {
    return GetPlacementFromMIDOID(pi, TOPPINGS_MTID, TOPPING_MB_OID) === TOPPING_NONE;
  },
  disable_on_chicken_sausage: function (pi, location, MENU) {
    return GetPlacementFromMIDOID(pi, TOPPINGS_MTID, TOPPING_CHIX_OID) === TOPPING_NONE;
  },
  disable_on_pork_sausage: function (pi, location, MENU) {
    return GetPlacementFromMIDOID(pi, TOPPINGS_MTID, TOPPING_SAUSAGE_OID) === TOPPING_NONE;
  },
  disable_on_ital: function (pi, location, MENU) {
    return GetPlacementFromMIDOID(pi, TOPPINGS_MTID, TOPPING_ITAL_OID) === TOPPING_NONE;
  },
  disable_on_dairy: function (pi, location, MENU) {
    return GetPlacementFromMIDOID(pi, TOPPINGS_MTID, TOPPING_MB_OID) === TOPPING_NONE && GetPlacementFromMIDOID(pi, SAUCE_MTID, SAUCE_WHITE_OID) === TOPPING_NONE && GetPlacementFromMIDOID(pi, TOPPINGS_MTID, TOPPING_BLEU_OID) === TOPPING_NONE;
  },
  disable_on_vegan: function (pi, location, MENU) {
    return GetPlacementFromMIDOID(pi, CHEESE_MTID, CHEESE_VEGAN_OID) === TOPPING_NONE;
  }
};

var TOPPING_NONE = 0;
var TOPPING_LEFT = 1;
var TOPPING_RIGHT = 2;
var TOPPING_WHOLE = 3;
var NO_MATCH = 0;
var AT_LEAST = 1;
var EXACT_MATCH = 2;
var LEFT_SIDE = 0;
var RIGHT_SIDE = 1;

// TODO: not addressed: disabling options and that entire dependency chain
var WCPOption = function (w_modifier, w_option, index, enable_function) {
  this.modifier = w_modifier;
  this.moid = w_option._id
  this.name = w_option.item.display_name;
  this.shortname = w_option.item.shortcode;
  this.description = w_option.item.description;
  this.price = w_option.item.price.amount / 100;
  this.index = index;
  this.enable_filter = enable_function;
  this.flavor_factor = w_option.metadata.flavor_factor;
  this.bake_factor = w_option.metadata.bake_factor;
  this.can_split = w_option.metadata.can_split;
  this.disable_data = w_option.item.disabled;
  this.IsEnabled = function (product, location, MENU) {
    // TODO: needs to factor in disable data for time based disable
    // TODO: needs to return false if we would exceed the limit for this modifier, IF that limit is > 1, because if it's === 1
    // we would handle the limitation by using smarts at the wcpmodifierdir level
    var modifier_option_find_function = function (val) {
      return val[1] === this.moid;
    };
    modifier_option_find_function = modifier_option_find_function.bind(this);
    var modifier_placement = product.modifiers[this.modifier._id] ? product.modifiers[this.modifier._id].find(modifier_option_find_function) : undefined;
    modifier_placement = modifier_placement === undefined ? TOPPING_NONE : modifier_placement[0];
    // TODO: bake and flavor stuff should move into the enable_filter itself, the option itself should just hold generalized metadata the enable filter function can use/reference
    var display_flags = product.PRODUCT_CLASS.display_flags;
    var BAKE_MAX = display_flags ? display_flags.bake_max : 100;
    var FLAVOR_MAX = display_flags ? display_flags.flavor_max : 100;
    var BAKE_DIFF_MAX = display_flags ? display_flags.bake_differential : 100;
    var proposed_delta = [0, 0];
    switch (location) {
      case TOPPING_LEFT: 
        switch (modifier_placement) {
          case TOPPING_NONE: proposed_delta = [+1, +0]; break;  // +1, +0
          case TOPPING_LEFT: proposed_delta = [-1, +0]; break;  // -1, +0
          case TOPPING_RIGHT: proposed_delta = [+1, -1]; break; // +1, -1
          case TOPPING_WHOLE: proposed_delta = [+0, -1]; break; // +0, -1
        }
        break;
      case TOPPING_RIGHT: 
        switch (modifier_placement) {
          case TOPPING_NONE: proposed_delta = [+0, +1]; break;  // +0, +1
          case TOPPING_LEFT: proposed_delta = [-1, +1]; break;  // -1, +1
          case TOPPING_RIGHT: proposed_delta = [+0, -1]; break; // +0, -1
          case TOPPING_WHOLE: proposed_delta = [-1, +0]; break; // -1, +0
        }
        break;
      case TOPPING_WHOLE: 
        switch (modifier_placement) {
          case TOPPING_NONE: proposed_delta = [+1, +1]; break;  // +1, +1
          case TOPPING_LEFT: proposed_delta = [+0, +1]; break;  // +0, +1
          case TOPPING_RIGHT: proposed_delta = [+1, +0]; break; // +1, +0
          case TOPPING_WHOLE: proposed_delta = [-1, -1]; break; // -1, -1
        }
        break;
      default: console.assert(false, "case not expected"); break;
    }

    var bake_after = [product.bake_count[LEFT_SIDE] + (this.bake_factor * proposed_delta[LEFT_SIDE]), product.bake_count[RIGHT_SIDE] + (this.bake_factor * proposed_delta[1])];
    var flavor_after = [product.flavor_count[LEFT_SIDE] + (this.flavor_factor * proposed_delta[LEFT_SIDE]), product.flavor_count[RIGHT_SIDE] + (this.flavor_factor * proposed_delta[1])];
    var passes_bake_diff_test = BAKE_DIFF_MAX >= Math.abs(bake_after[LEFT_SIDE]-bake_after[RIGHT_SIDE]);
    var has_room_on_left = bake_after[LEFT_SIDE] <= BAKE_MAX && flavor_after[LEFT_SIDE] <= FLAVOR_MAX;
    var has_room_on_right = bake_after[RIGHT_SIDE] <= BAKE_MAX && flavor_after[RIGHT_SIDE] <= FLAVOR_MAX;

    return this.enable_filter(product, location, MENU) && has_room_on_left && has_room_on_right && passes_bake_diff_test;

    // // TODO: pickup here RESUME1 note: IsEnabled should be renamed: button_enable or something since enabling is going to be different from it being selected (can't allow someone to violate the max bake difference)
    // switch (location) {
    //   case TOPPING_LEFT: return base && (modifier_placement === TOPPING_WHOLE || modifier_placement === TOPPING_LEFT || has_room_on_left);
    //   case TOPPING_RIGHT: return base && (modifier_placement === TOPPING_WHOLE || modifier_placement === TOPPING_RIGHT || has_room_on_right);
    //   case TOPPING_WHOLE: return base && (modifier_placement === TOPPING_WHOLE || (has_room_on_left && modifier_placement === TOPPING_RIGHT) || (has_room_on_right && modifier_placement === TOPPING_LEFT) || (has_room_on_left && has_room_on_right));
    // }
    // console.assert(false, "invariant");
    // return false; // error?
  };
};

// helper function for WCPProduct
function ExtractMatchForSide(side, matrix) {
  // we take the min of EXACT_MATCH and the thing we just computed because if there are no modifiers, then we'll get Infinity
  return Math.min(EXACT_MATCH, Math.min.apply(0, matrix.map(function (modcompare_arr) {
    return Math.min.apply(0, modcompare_arr.map(function (comp) {
      return comp[side];
    }));
  })));
};

function DeepCopyPlacedOptions(modifiers) {
  var ret = {};
  for (var mid in modifiers) {
    ret[mid] = modifiers[mid].map(function (x) { return [x[0], x[1]]; });
  }
  return ret;
}

function GetModifierOptionFromMIDOID(menu, mid, oid) {
  return menu.modifiers[mid].options[oid];
}

function CopyWCPProduct(pi) {
  return new WCPProduct(pi.PRODUCT_CLASS, pi.piid, pi.name, pi.description, pi.ordinal, pi.modifiers, pi.shortcode, pi.base_price, pi.disable_data, pi.is_base, pi.display_flags);
}
function WCPProductFromDTO(dto, MENU) {
  return new WCPProduct(MENU.product_classes[dto.pid].product, "", "", "", 0, dto.modifiers, "", dto.base_price, null, false, {});
}


// we need to take a map of these fields and allow name to be null if piid is _NOT_ set, piid should only be set if it's an exact match of a product instance in the catalog
var WCPProduct = function (product_class, piid, name, description, ordinal, modifiers, shortcode, base_price, disable_data, is_base, display_flags) {
  this.PRODUCT_CLASS = product_class;
  this.piid = piid;
  this.name = name;
  this.description = description;
  this.ordinal = ordinal;
  this.disable_data = disable_data;
  this.is_base = is_base;
  this.shortcode = shortcode;
  this.display_flags = display_flags;
  // base price is passed in, computed price represents the item with modifiers
  this.base_price = base_price;
  // product.modifiers[mtid] = [[placement, option_id]]
  // enum is 0: none, 1: left, 2: right, 3: both
  this.modifiers = DeepCopyPlacedOptions(modifiers);
  // memoized metadata
  this.price = null;
  this.is_split = false;
  this.bake_count = [0, 0];
  this.flavor_count = [0, 0];

  this.ComputePrice = function(MENU) {
    var price = this.base_price;
    for (var mt in this.modifiers) {
      this.modifiers[mt].forEach(function(opt) {
        if (opt[0] != TOPPING_NONE) {
          price += MENU.modifiers[mt].options[opt[1]].price;
        }
      });
    }
    return price;
  };

  this.RecomputeMetadata = function(MENU) {
    // recomputes bake_count, flavor_count, is_split
    var bake_count = [0, 0];
    var flavor_count = [0, 0];
    var is_split = false;
    for (var mt in this.modifiers) {
      this.modifiers[mt].forEach(function(opt) {
        var option_obj = MENU.modifiers[mt].options[opt[1]];
        if (opt[0] === TOPPING_LEFT || opt[0] === TOPPING_WHOLE) {
          bake_count[LEFT_SIDE] += option_obj.bake_factor;
          flavor_count[LEFT_SIDE] += option_obj.flavor_factor;
        }
        if (opt[0] === TOPPING_RIGHT || opt[0] === TOPPING_WHOLE) {
          bake_count[RIGHT_SIDE] += option_obj.bake_factor;
          flavor_count[RIGHT_SIDE] += option_obj.flavor_factor;
        }
        is_split = is_split || opt[0] === TOPPING_LEFT || opt[0] === TOPPING_RIGHT;
      });
    }
    this.bake_count = bake_count;
    this.flavor_count = flavor_count;
    this.is_split = is_split;
  };

  function Compare(first, other, MENU) {
    var modifier_option_find_function_factory = function (moid) {
      return function (val) {
        return val[1] === moid;
      };
    };

    var modifiers_match_matrix = [];

    // need to compare PIDs of first and other, then use the PID to develop the modifiers matrix since one of the two product instances might not have a value for every modifier.
    if (first.PRODUCT_CLASS._id != other.PRODUCT_CLASS._id) {
      // no match on PID so we need to return 0
      return { mirror: false, match_matrix: modifiers_match_matrix, match: [[[NO_MATCH, NO_MATCH]]] }
    }

    // this is a multi-dim array, in order of the MTID as it exists in the product class definition
    // disabled modifier types and modifier options are all present as they shouldn't contribute to comparison mismatch
    // elements of the modifiers_match_matrix are arrays of <LEFT_MATCH, RIGHT_MATCH> tuples
    first.PRODUCT_CLASS.modifiers.forEach(function (MID) {
      modifiers_match_matrix.push(MENU.modifiers[MID].options_list.map(function () { return [EXACT_MATCH, EXACT_MATCH]; }));
    })

    // identify the base PIID of this product class
    // var BASE_PRODUCT_INSTANCE = MENU.catalog.products[first.pid].instances_list.find(function(prod) { return prod.is_base === true; });
    // if (!BASE_PRODUCT_INSTANCE) { 
    //   console.error(`Cannot find base product instance of ${JSON.stringify(this.PRODUCT_CLASS)}.`);
    //   return { mirror: false, match: [[[NO_MATCH, NO_MATCH]]] }
    // }

    var is_mirror = true;
    // main comparison loop!
    first.PRODUCT_CLASS.modifiers.forEach(function (MID, midx) {
      var first_option_list = first.modifiers.hasOwnProperty(MID) ? first.modifiers[MID] : [];
      var other_option_list = other.modifiers.hasOwnProperty(MID) ? other.modifiers[MID] : [];
      // in each modifier, need to determine if it's a SINGLE or MANY select 
      var CATALOG_MODIFIER_INFO = MENU.modifiers[MID];
      if (CATALOG_MODIFIER_INFO.modifier_type.min_selected === 1 && CATALOG_MODIFIER_INFO.modifier_type.max_selected === 1) {
        // CASE: SINGLE select modifier, this logic isn't very well-defined. TODO: rework
        console.assert(first_option_list.length === 1 && other_option_list.length === 1, "Split options for single select modifiers not supported yet");
        var first_option = first_option_list[0];
        var other_option = other_option_list[0];
        if (first_option[1] !== other_option[1]) {
          // OID doesn't match, need to set AT_LEAST for JUST the option on the "first" product
          CATALOG_MODIFIER_INFO.options_list.forEach(function (option, oidx) {
            if (first_option[1] === option.moid) {
              modifiers_match_matrix[midx][oidx] = [AT_LEAST, AT_LEAST];
              is_mirror = false;
            }
          });
        }
      }
      else {
        // CASE: MULTI select modifier
        CATALOG_MODIFIER_INFO.options_list.forEach(function (option, oidx) {
          // todo: since the options will be in order, we can be smarter about not using a find here and track 2 indices instead   
          var finder = modifier_option_find_function_factory(option.moid);       
          var first_option = first_option_list.find(finder);
          var other_option = other_option_list.find(finder);
          var first_option_placement = first_option ? first_option[0] : TOPPING_NONE;
          var other_option_placement = other_option ? other_option[0] : TOPPING_NONE;
          switch (other_option_placement) {
            case TOPPING_NONE:
              switch (first_option_placement) {
                case TOPPING_NONE: modifiers_match_matrix[midx][oidx] = [EXACT_MATCH, EXACT_MATCH]; break;
                case TOPPING_LEFT: modifiers_match_matrix[midx][oidx] = [AT_LEAST, EXACT_MATCH]; is_mirror = false; break;
                case TOPPING_RIGHT: modifiers_match_matrix[midx][oidx] = [EXACT_MATCH, AT_LEAST]; is_mirror = false; break;
                case TOPPING_WHOLE: modifiers_match_matrix[midx][oidx] = [AT_LEAST, AT_LEAST]; is_mirror = false; break;
                default: console.assert(false, "invalid topping value");
              }
              break;
            case TOPPING_LEFT:
              switch (first_option_placement) {
                case TOPPING_NONE: modifiers_match_matrix[midx][oidx] = [NO_MATCH, EXACT_MATCH]; is_mirror = false; break;
                case TOPPING_LEFT: modifiers_match_matrix[midx][oidx] = [EXACT_MATCH, EXACT_MATCH]; is_mirror = false; break;
                case TOPPING_RIGHT: modifiers_match_matrix[midx][oidx] = [NO_MATCH, NO_MATCH]; break;
                case TOPPING_WHOLE: modifiers_match_matrix[midx][oidx] = [EXACT_MATCH, AT_LEAST]; is_mirror = false; break;
                default: console.assert(false, "invalid topping value");
              }
              break;
            case TOPPING_RIGHT:
              switch (first_option_placement) {
                case TOPPING_NONE: modifiers_match_matrix[midx][oidx] = [EXACT_MATCH, NO_MATCH]; is_mirror = false; break;
                case TOPPING_LEFT: modifiers_match_matrix[midx][oidx] = [NO_MATCH, NO_MATCH]; break;
                case TOPPING_RIGHT: modifiers_match_matrix[midx][oidx] = [EXACT_MATCH, EXACT_MATCH]; is_mirror = false; break;
                case TOPPING_WHOLE: modifiers_match_matrix[midx][oidx] = [AT_LEAST, EXACT_MATCH]; is_mirror = false; break;
                default: console.assert(false, "invalid topping value");
              }
              break;
            case TOPPING_WHOLE:
              switch (first_option_placement) {
                case TOPPING_NONE: modifiers_match_matrix[midx][oidx] = [NO_MATCH, NO_MATCH]; is_mirror = false; break;
                case TOPPING_LEFT: modifiers_match_matrix[midx][oidx] = [EXACT_MATCH, NO_MATCH]; is_mirror = false; break;
                case TOPPING_RIGHT: modifiers_match_matrix[midx][oidx] = [NO_MATCH, EXACT_MATCH]; is_mirror = false; break;
                case TOPPING_WHOLE: modifiers_match_matrix[midx][oidx] = [EXACT_MATCH, EXACT_MATCH]; break;
                default: console.assert(false, "invalid topping value");
              }
              break;
            default: console.assert(false, "invalid topping value");
          }
        });
      }
    });
    return {
      mirror: is_mirror,
      match_matrix: modifiers_match_matrix,
      match: [ExtractMatchForSide(LEFT_SIDE, modifiers_match_matrix), ExtractMatchForSide(RIGHT_SIDE, modifiers_match_matrix)]
    };
  }

  IsEquals = function (a, b, MENU) {
    var comparison_info = Compare(a, b, MENU);
    return comparison_info.mirror ||
      (comparison_info.match[LEFT_SIDE] === EXACT_MATCH && comparison_info.match[RIGHT_SIDE] === EXACT_MATCH);
  }

  this.Equals = function (other, MENU) {
    return IsEquals(this, other, MENU);
  };

  this.RecomputeName = function (MENU) {
    var PRODUCT_CLASS = this.PRODUCT_CLASS;
    var PRODUCT_CLASS_MENU_ENTRY = MENU.product_classes[PRODUCT_CLASS._id];
    if (this.piid) {
      // if we have a PI ID then that means we're an unmodified product instance from the catalog
      // and we should find that product and assume its name.
      var catalog_pi = PRODUCT_CLASS_MENU_ENTRY.instances[this.piid];
      this.name = catalog_pi.name;
      this.shortname = catalog_pi.shortname;
      this.shortcode = catalog_pi.shortcode;
      return;
    }

    // at this point we only know what product class we belong to. we might be an unmodified product, 
    // but that will need to be determined.
    var BASE_PRODUCT_INSTANCE = PRODUCT_CLASS_MENU_ENTRY.instances_list.find(function (prod) { return prod.is_base === true; });
    if (!BASE_PRODUCT_INSTANCE) {
      console.error(`Cannot find base product instance of ${JSON.stringify(this.PRODUCT_CLASS)}.`);
      return;
    }

    var shortcodes = [BASE_PRODUCT_INSTANCE.shortcode, BASE_PRODUCT_INSTANCE.shortcode];
    var menu_match = [null, null];
    var menu_match_compare = [EXACT_MATCH, EXACT_MATCH];
    // name_components is an ordered list of things that are AT_LEAST compared to the menu match, on a per-side basis
    // that makes this a list of list of the tuple <display_left, display_right>
    // note that every modifier that belongs to this product class exists in this list, meaning if a pizza has no toppings, there's still an empty array for that modifier type
    // from the index in this array, we can determine the name or shortnames like this:
    // name_components[mid_index][option_index][side_index] ? MENU.modifiers[this.PRODUCT_CLASS.modifiers[mid_index]].options_list[option_index].item.display_name : ""
    var name_components = [];
    PRODUCT_CLASS.modifiers.forEach(function (MID) {
      name_components.push(MENU.modifiers[MID].options_list.map(function () { return [false, false]; }));
    })

    function ComputeForSide(side, comparison, comparison_product) {
      if (menu_match[side] !== null) {
        return;
      }
      var is_compare_to_base = BASE_PRODUCT_INSTANCE.piid === comparison_product.piid;
      if (comparison.match[side] !== NO_MATCH) {
        PRODUCT_CLASS.modifiers.forEach(function (mtid, mid_index) {
          var CATALOG_MODIFIER_INFO = MENU.modifiers[mtid];
          if (CATALOG_MODIFIER_INFO.modifier_type.min_selected === 1 && CATALOG_MODIFIER_INFO.modifier_type.max_selected === 1) {
            // if the comparison is to the base product instance, 
            // then single select options THAT ARE SELECTED need to be displayed even if they're exact matches
            //TODO: figure this one out
            var found_selection = -1;
            var base_moid = BASE_PRODUCT_INSTANCE.modifiers[mtid][0][1];
            var base_moidx = -1;
            comparison.match_matrix[mid_index].forEach(function (option_match, oid_index) {
              if (option_match[side] === AT_LEAST) {
                found_selection = oid_index;
              }
              if (MENU.modifiers[mtid].options_list[oid_index].moid === base_moid) {
                base_moidx = oid_index;
              }
            });
            if (found_selection >= 0) {
              name_components[mid_index][found_selection][side] = true;
            }
            else if (is_compare_to_base && !PRODUCT_CLASS.display_flags.show_name_of_base_product) {
              // whatever we have selected is the default option, use the BASE_PRODUCT_INSTANCE to grab that info
              // since the display flag show_name_of_base_product is OFF
              name_components[mid_index][base_moidx][side] = true;
            }
            
          }
          else if (comparison.match[side] === AT_LEAST) {
            comparison.match_matrix[mid_index].forEach(function (option_match, oid_index) {
              if (option_match[side] === AT_LEAST) {
                name_components[mid_index][oid_index][side] = true;
              }
            });
          }
        });
        menu_match[side] = comparison_product;
        menu_match_compare[side] = comparison.match[side];
        shortcodes[side] = comparison_product.shortcode;
      }
    }

    function BuildName(product) {
      console.assert(menu_match[LEFT_SIDE] !== null && menu_match[RIGHT_SIDE] !== null, "We should have both matches determined by now.");
      // assign shortcode (easy)
      product.shortcode = product.is_split && shortcodes[LEFT_SIDE] !== shortcodes[RIGHT_SIDE] ? shortcodes.join("|") : shortcodes[LEFT_SIDE];

      // determine if we're comparing to the base product on the left and right sides
      var is_compare_to_base = [
        BASE_PRODUCT_INSTANCE.piid === menu_match[LEFT_SIDE].piid,
        BASE_PRODUCT_INSTANCE.piid === menu_match[RIGHT_SIDE].piid];  
      
      // split out options beyond the base product into left additions, right additions, and whole additions
      // each entry in these arrays represents the modifier index on the product class and the option index in that particular modifier
      var additional_options = { left: [], right: [], whole: [] };
      for (var mt_index = 0; mt_index < name_components.length; ++mt_index) {
        for (var opt_index = 0; opt_index < name_components[mt_index].length; ++opt_index) {
          if (name_components[mt_index][opt_index][LEFT_SIDE] === true &&
            name_components[mt_index][opt_index][RIGHT_SIDE] === true) {
            additional_options.whole.push([mt_index, opt_index]);
          }
          else if (name_components[mt_index][opt_index][LEFT_SIDE] === true &&
            name_components[mt_index][opt_index][RIGHT_SIDE] === false) {
            additional_options.left.push([mt_index, opt_index]);
          }
          else if (name_components[mt_index][opt_index][LEFT_SIDE] === false &&
            name_components[mt_index][opt_index][RIGHT_SIDE] === true) {
            additional_options.right.push([mt_index, opt_index]);
          }
        }
      }

      function ComponentsList(source, getter) {
        return source.map(function (x) {
          return getter(MENU.modifiers[PRODUCT_CLASS.modifiers[x[0]]].options_list[x[1]]);
        });
      }

      var split_options = ["∅", "∅"];
      var short_split_options = ["∅", "∅"];
      if (additional_options.left.length) {
        split_options[LEFT_SIDE] = ComponentsList(additional_options.left, function (x) { return x.name; }).join(" + ");
        short_split_options[LEFT_SIDE] = ComponentsList(additional_options.left, function (x) { return x.shortname; }).join(" + ");
      }
      if (additional_options.right.length) {
        split_options[RIGHT_SIDE] = ComponentsList(additional_options.right, function (x) { return x.name; }).join(" + ");
        short_split_options[RIGHT_SIDE] = ComponentsList(additional_options.right, function (x) { return x.shortname; }).join(" + ");
      }

      var name_components_list = null;
      var shortname_components_list = null;
      if (product.is_split) {
        name_components_list = ComponentsList(additional_options.whole, function (x) { return x.name; });
        shortname_components_list = ComponentsList(additional_options.whole, function (x) { return x.shortname; });
        if (menu_match[LEFT_SIDE].piid === menu_match[RIGHT_SIDE].piid) {
          if (!is_compare_to_base[LEFT_SIDE] || PRODUCT_CLASS.display_flags.show_name_of_base_product) {
            name_components_list.unshift(menu_match[LEFT_SIDE].name);
            shortname_components_list.unshift(menu_match[LEFT_SIDE].name);
          }
          name_components_list.push("(" + split_options.join(" | ") + ")");
          shortname_components_list.push("(" + short_split_options.join(" | ") + ")");
        }
        else {
          // split product, different product instance match on each side
          // logical assertion: if name_components for a given side are all false, then it's an exact match
          var names = [
            (!is_compare_to_base[LEFT_SIDE] || PRODUCT_CLASS.display_flags.show_name_of_base_product) ? [menu_match[LEFT_SIDE].name] : [],
            (!is_compare_to_base[RIGHT_SIDE] || PRODUCT_CLASS.display_flags.show_name_of_base_product) ? [menu_match[RIGHT_SIDE].name] : []
          ];
          var shortnames = names.slice();
          if (additional_options.left.length) {
            names[LEFT_SIDE] = names[LEFT_SIDE].concat(split_options[LEFT_SIDE]);
            shortnames[LEFT_SIDE] = shortnames[LEFT_SIDE].concat(short_split_options[LEFT_SIDE]);
          }
          if (additional_options.right.length) {
            names[RIGHT_SIDE] = names[RIGHT_SIDE].concat(split_options[RIGHT_SIDE]);
            shortnames[RIGHT_SIDE] = shortnames[RIGHT_SIDE].concat(short_split_options[RIGHT_SIDE]);
          }
          names[LEFT_SIDE].length ? 0 : names[LEFT_SIDE].push("∅");
          names[RIGHT_SIDE].length ? 0 : names[RIGHT_SIDE].push("∅");
          name_components_list.push(`( ${names[LEFT_SIDE].join(" + ")} | ${names[RIGHT_SIDE].join(" + ")} )`);
          shortnames[LEFT_SIDE].length ? 0 : shortnames[LEFT_SIDE].push("∅");
          shortnames[RIGHT_SIDE].length ? 0 : shortnames[RIGHT_SIDE].push("∅");
          shortname_components_list.push(`( ${shortnames[LEFT_SIDE].join(" + ")} | ${shortnames[RIGHT_SIDE].join(" + ")} )`);
        }
      } // end is_split case
      else {
        name_components_list = ComponentsList(additional_options.whole, function (x) { return x.name; });
        shortname_components_list = ComponentsList(additional_options.whole, function (x) { return x.shortname; });
        // we're using the left side because we know left and right are the same
        // if exact match to base product, no need to show the name
        if (!is_compare_to_base[LEFT_SIDE] || PRODUCT_CLASS.display_flags.show_name_of_base_product) {
          name_components_list.unshift(menu_match[LEFT_SIDE].name);
          shortname_components_list.unshift(menu_match[LEFT_SIDE].name);
        }
        if (menu_match_compare[LEFT_SIDE] === EXACT_MATCH) {
          // assign PIID
          product.piid = menu_match[LEFT_SIDE].piid;
          product.description = menu_match[LEFT_SIDE].description;
        }
      }
      product.name = name_components_list.join(" + ");
      product.shortname = shortname_components_list.length === 0 ? "BASE PRODUCT" : shortname_components_list.join(" + ");
    }

    // iterate through menu, until has_left and has_right are true
    // a name can be assigned once an exact or at least match is found for a given side
    // NOTE the guarantee of ordering the instances in most modified to base product isn't guaranteed and shouldn't be assumed, but we need it here. how can we order the instances in a helpful way? Need to figure this out
    for (var pi_index = 0; pi_index < PRODUCT_CLASS_MENU_ENTRY.instances_list.length; ++pi_index) {
      var comparison_product = PRODUCT_CLASS_MENU_ENTRY.instances_list[pi_index];
      var comparison_info = Compare(this, PRODUCT_CLASS_MENU_ENTRY.instances_list[pi_index], MENU);
      ComputeForSide(LEFT_SIDE, comparison_info, comparison_product);
      ComputeForSide(RIGHT_SIDE, comparison_info, comparison_product);
      if (menu_match[LEFT_SIDE] !== null && menu_match[RIGHT_SIDE] !== null) {
        // TODO: if it's an exact match on both sides, we need to set the PIID accordingly
        // finished, proceed to build the names and assign shortcodes
        return BuildName(this);
      }
    }
  };

  this.SplitOptionsList = function (MENU) {
    // generates three lists ordered from top to bottom: whole, left only, right only
    // returns a list of <MTID, OID> tuples
    var ret = { left: [], right: [], whole: [] };
    for (var midx = 0; midx < this.PRODUCT_CLASS.modifiers.length; ++midx) {
      var mid = this.PRODUCT_CLASS.modifiers[midx];
      if (this.modifiers.hasOwnProperty(mid)) {
        this.modifiers[mid].forEach(function (option_placement) {
          switch (option_placement[0]) {
            case TOPPING_LEFT: ret.left.push([mid, option_placement[1]]); break;
            case TOPPING_RIGHT: ret.right.push([mid, option_placement[1]]); break;
            case TOPPING_WHOLE: ret.whole.push([mid, option_placement[1]]); break;
            default: break;
          }
        });
      }
    };
    return ret;
  };

  this.DisplayOptions = function (MENU) {
    var split_options = this.SplitOptionsList();
    var options_sections = [];

    if (split_options.whole.length > 0) {
      var option_names = split_options.whole.map(function (x) { return GetModifierOptionFromMIDOID(MENU, x[0], x[1]).name; });
      options_sections.push(["Whole", option_names.join(" + ")]);
    }
    if (split_options.left.length > 0) {
      var option_names = split_options.left.map(function (x) { return GetModifierOptionFromMIDOID(MENU, x[0], x[1]).name; });
      options_sections.push(["Left", option_names.join(" + ")]);
    }
    if (split_options.right.length > 0) {
      var option_names = split_options.right.map(function (x) { return GetModifierOptionFromMIDOID(MENU, x[0], x[1]).name; });
      options_sections.push(["Right", option_names.join(" + ")]);
    }
    return options_sections;
  };

  // rename to initialize
  this.Initialize = function (MENU) {
    this.price = this.ComputePrice(MENU);
    this.RecomputeMetadata(MENU);
    this.RecomputeName(MENU);
    this.options_sections = this.DisplayOptions(MENU);
  };

  this.ToDTO = function () {
    return {
      pid: this.PRODUCT_CLASS._id,
      base_price: this.base_price,
      modifiers: this.modifiers
    };
  };

};


function GenerateCatalogMapFromCatalog(CONFIG, cat, $sce) {
  function WARIOPlacementToLocalPlacementEnum(w_placement) {
    switch (w_placement) {
      case "WHOLE": return TOPPING_WHOLE; break;
      case "LEFT": return TOPPING_LEFT; break;
      case "RIGHT": return TOPPING_RIGHT; break;
      default: break;
    };
    return TOPPING_NONE;
  }
  console.log(cat);
  if (cat.version === CONFIG.MENU.version) {
    return CONFIG.MENU;
  }
  var menu = {
    // modifiers are { MID: { modifier_type: WARIO modifier type JSON, options_list: [WCPOption], options: {OID: WCPOption} } }
    modifiers: {},
    // product_classes are { PID: { product: WARIO product class, instances_list: [WCPProduct], instances: {PIID: WCPProduct} } }
    product_classes: {},
    // categories are {CID: { menu: [WCPProducts], children: [CID], menu_name: HTML, subtitle: HTML } }
    categories: {},
    version: cat.version
  };

  for (var mtid in cat.modifiers) {
    var mod = cat.modifiers[mtid].modifier_type;
    var opt_index = 0;
    var modifier_entry = { modifier_type: mod, options_list: [], options: {} };
    cat.modifiers[mtid].options.sort(function (a, b) { return a.ordinal - b.ordinal }).forEach(function (opt) {
      var enable_function = ENABLE_FUNCTIONS[opt.enable_function_name];
      var option = new WCPOption(mod, opt, opt_index, enable_function);
      modifier_entry.options_list.push(option);
      modifier_entry.options[option.moid] = option;
      ++opt_index;
    });
    menu.modifiers[mtid] = modifier_entry;
  }

  for (var pid in cat.products) {
    var product_class = cat.products[pid].product;
    //var prod_index = 0;
    var product_entry = { product: product_class, instances_list: [], instances: {} };
    cat.products[pid].instances.sort(function (a, b) { return a.ordinal - b.ordinal }).forEach(function (prod) {
      var modifiers = {};
      prod.modifiers.forEach(function(mod) {
        modifiers[mod.modifier_type_id] = mod.options.map(function (option_placement) { return [WARIOPlacementToLocalPlacementEnum(option_placement.placement), option_placement.option_id] });
      });
      var product_instance = new WCPProduct(
        product_class,
        prod._id,
        prod.item.display_name,
        prod.item.description,
        prod.ordinal, // this might need to be prod_index, not sure if that is even needed anymore 
        modifiers,
        prod.item.shortcode,
        prod.item.price.amount / 100,
        prod.item.disabled,
        prod.is_base,
        prod.display_flags);
      product_entry.instances_list.push(product_instance);
      product_entry.instances[product_instance.piid] = product_instance;
      //++prod_index;
    });
    menu.product_classes[pid] = product_entry;
  }

  for (var pid in cat.products) {
    menu.product_classes[pid].instances_list.forEach(function (pi) { 
      pi.Initialize(menu);
    })
  };

  console.log(menu);
  for (var catid in cat.categories) {
    var category_entry = {
      menu: [],
      children: cat.categories[catid].children.sort(function (a, b) { return cat.categories[a].category.ordinal - cat.categories[b].category.ordinal; }),
      menu_name: cat.categories[catid].category.description ? $sce.trustAsHtml(cat.categories[catid].category.description) : cat.categories[catid].category.name,
      subtitle: cat.categories[catid].category.subheading ? $sce.trustAsHtml(cat.categories[catid].category.subheading) : null,
    }
    cat.categories[catid].products.forEach(function (product_class) {
      category_entry.menu = category_entry.menu.concat(menu.product_classes[product_class].instances_list);
    })
    category_entry.menu.sort(function (a, b) { return a.ordinal - b.ordinal; });
    menu.categories[catid] = category_entry;
  }

  return menu;
}


// handy class representing a line in the product cart
// useful to allow modifications on the product by setting it to a new product instance
// instead of modifying the product instance itself
var CartEntry = function (catid, product, quantity, can_edit) {
  this.catid = catid;
  this.pi = product;
  this.quantity = quantity;
  this.can_edit = can_edit;
};

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

  this.TAX_RATE = 0.101;

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

  this.UpdateCatalog = function (cat, $sce) {
    var catalog_map = GenerateCatalogMapFromCatalog(this, cat, $sce);
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
      this.autograt = this.num_pizza >= 5 || this.service_type === cfg.DELIVERY || this.service_type === cfg.DINEIN ? .2 : 0;
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
      // need: name, shortname, shortcode for each product, split into two sections
      var dto = { pizza: [], extras: [] };
      this.linear_cart.forEach(function(cart_entry) {
        var entrydto = [cart_entry.quantity, {name: cart_entry.pi.name, shortname: cart_entry.pi.shortname, shortcode: cart_entry.pi.shortcode }];
        cart_entry.catid === PIZZAS_CATID ? dto.pizza.push(entrydto) : dto.extras.push(entrydto);
      });
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
          useragent: navigator.userAgent + " FEV6",
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
        return ENABLE_DINE_IN;
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
      var split_toppings = true;//$location.search().split === true;
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
        if ((pi.display_flags && pi.display_flags.skip_customization) || pi.PRODUCT_CLASS.modifiers.length === 0) {
          var pi_copy = CopyWCPProduct(pi);
          pi_copy.piid = "";
          pi_copy.Initialize(this.CONFIG.MENU);

          this.AddToOrder(cid, pi_copy);
        }
        else {
          pmenuctrl.SetProduct(cid, pi, true);
        }
      }

      this.FilterDisabledProducts = function(menu) {
        return function ( item ) {
          var all_enabled = DisableDataCheck(item.disable_data);
          for (var mtid in item.modifiers) {
            all_enabled = all_enabled && Math.min(1, Math.min.apply(null, item.modifiers[mtid].map(function(x) {
              return DisableDataCheck(menu.modifiers[mtid].options[x[1]].disable_data);
            })));
          }
          return all_enabled;
        }
      }

      this.FilterEmptyCategories = function(menu) {
        var filter_fxn = this.FilterDisabledProducts(menu);
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
            this.PostCartUpdate();
            return;
          }
        }
        // add new entry
        // TODO: the modifiers length check isn't actually exhaustive as some modifiers might be disabled for any reason
        this.s.cart[cid].push(new CartEntry(cid, pi, 1, pi.PRODUCT_CLASS.modifiers.length !== 0));
        this.PostCartUpdate();
      }

      this.UpdateOrderEntry = function(cart_entry, new_pi) {
        cart_entry.pi = new_pi;
        for (var i = 0; i < this.s.cart[cart_entry.catid].length; ++i) {
          if (cart_entry !== this.s.cart[cart_entry.catid][i] && this.s.cart[cart_entry.catid][i].pi.Equals(new_pi, this.CONFIG.MENU)) {
            cart_entry.quantity += this.s.cart[cart_entry.catid][i].quantity;
            this.s.cart[cart_entry.catid].splice(i, 1);
            this.PostCartUpdate();
            return;
          }
        }
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
            this.s.cart[cid][i].quantity = FixQuantity(this.s.cart[cid][i].quantity, clear_if_invalid);
          }
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

  app.controller("ProductMenuController", function () {
    this.CONFIG = wcpconfig;
    this.selection = null;
    this.cart_entry = null;
    this.catid = null;
    this.is_addition = true;
    this.messages = [];
    this.modifier_map = {};

    // leaving this for now...
    this.PopulateOrderGuide = function () {
      // var addon_chz = this.selection.cheese_option != this.CONFIG.MENU.cheeses.regular.shortname ? 1 : 0;
      // this.messages = [];
      // if (this.selection) {
      //   if (this.selection.flavor_count[0] + addon_chz < ADD_SOMETHING_THRESHOLD || this.selection.flavor_count[1] + addon_chz < ADD_SOMETHING_THRESHOLD) {
      //     this.messages.push(CONST_MESSAGE_ADD_MORE_TO_PIZZA);
      //   }
      //   if (this.selection.flavor_count[0] > 5 || this.selection.flavor_count[1] > 5) {
      //     this.messages.push("We love our toppings too, but adding this many flavors can end up detracting from the overall enjoyment. We'd suggest scaling this pizza back a bit. If this is your first time dining with us, we'd suggest ordering a menu pizza without modifications.");
      //   }
      //   if (this.selection.sauce == this.CONFIG.MENU.sauces.white && this.selection.toppings_tracker[this.CONFIG.MENU.toppings_dict.bleu.index] != TOPPING_NONE) {
      //     this.messages.push("Our white sauce really lets the bleu cheese flavor come through. If you haven't had this pairing before, we'd suggest asking for light bleu cheese or switching back to red sauce.");
      //   }
      // }
    };

    this.PostModifierChangeCallback = function (mid, oid, placement) {
      console.assert(this.selection);

      var updated_modifiers = {};
      // NEEDS to iterate in the order of the options in the MENU otherwise the display will be out of order
      for (var mtidx = 0; mtidx < this.selection.PRODUCT_CLASS.modifiers.length; ++mtidx) {
        var mtid = this.selection.PRODUCT_CLASS.modifiers[mtidx];
        if (this.modifier_map.hasOwnProperty(mtid)) { 
          var selected_list = [];
          for (var moidx = 0; moidx < this.CONFIG.MENU.modifiers[mtid].options_list.length; ++moidx) {
            var moid = this.CONFIG.MENU.modifiers[mtid].options_list[moidx].moid;
            if (this.modifier_map[mtid].hasOwnProperty(moid)) {
              selected_list.push([this.modifier_map[mtid][moid], moid]);  
            }
          }
          if (selected_list.length) {
            updated_modifiers[mtid] = selected_list;
          }
        }
      }
      var selectionDTO = this.selection.ToDTO();
      selectionDTO.modifiers = updated_modifiers;
      var selection_copy = WCPProductFromDTO(selectionDTO, this.CONFIG.MENU);
      selection_copy.description = this.selection.description;
      selection_copy.Initialize(this.CONFIG.MENU);
      this.selection = selection_copy;
      this.PopulateOrderGuide();
    }

    this.EditCartEntry = function(cart_entry) {
      var pi_copy = CopyWCPProduct(cart_entry.pi);
      pi_copy.Initialize(this.CONFIG.MENU);
      this.cart_entry = cart_entry;
      this.SetProduct(cart_entry.catid, pi_copy, false);
    }

    this.SetProduct = function (catid, product_instance, is_new) {
      this.selection = CopyWCPProduct(product_instance);
      // note: clearing the PIID allows things like a BYO pizza to show up as RED SAUCE + MOZZARELLA after it's added to the customizer
      this.selection.piid = "";
      this.selection.Initialize(this.CONFIG.MENU);
      this.catid = catid;
      this.is_addition = is_new;

      // mod map is { MID: { OID: placement } }
      var selection_modifiers_map = {};
      for (var midx = 0; midx < this.selection.PRODUCT_CLASS.modifiers.length; ++midx) {
        var mid = this.selection.PRODUCT_CLASS.modifiers[midx];
        var modifier_entry = this.CONFIG.MENU.modifiers[mid];
        // create the { OID: placement } part of the map
        selection_modifiers_map[mid] = {};
        if (this.selection.modifiers.hasOwnProperty(mid)) {
          this.selection.modifiers[mid].forEach(function (option_placement) {
            selection_modifiers_map[mid][option_placement[1]] = option_placement[0];
          })
        }
      }
      this.modifier_map = selection_modifiers_map;
      this.PopulateOrderGuide();
    };


    this.UnsetProduct = function () {
      this.selection = null;
      this.cart_entry = null;
      this.catid = null;
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
        description: "=description"
      },
      controller: function () { 
        this.ShowOptionsSections = function () {
          return !(this.prod.options_sections.length === 1 && this.prod.options_sections[0][1] === this.prod.name)
        }
      },
      controllerAs: "ctrl",
      bindToController: true,
      template: '<h4 class="menu-list__item-title"><span class="item_title">{{ctrl.prod.name}}</span><span ng-if="ctrl.dots" class="dots"></span></h4>' +
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
        '<span ng-if="ctrl.price" class="menu-list__item-price">{{ctrl.prod.price}}</span>',
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
      },
      controllerAs: "ctrl",
      bindToController: true,
      controller: function () {
        this.Initialize = function () {
          
          var menu = this.config.MENU;
          // determine list of visible options
          var filtered_options = menu.modifiers[this.mtid].options_list.filter(function (x) {
            return DisableDataCheck(x.disable_data);
          })
          if (menu.modifiers[this.mtid].modifier_type.display_flags && menu.modifiers[this.mtid].modifier_type.display_flags.omit_options_if_not_available) {
            var filterfxn = function (x) {
              return x.IsEnabled(this.selection, this.config.WHOLE, menu) ||
                (x.can_split && this.allowsplit && (
                  x.IsEnabled(this.selection, this.config.LEFT, menu) ||
                  x.IsEnabled(this.selection, this.config.RIGHT, menu)
                ));
            };
            filterfxn = filterfxn.bind(this);
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
                var base_option = menu.modifiers[this.mtid].options[BASE_PRODUCT_INSTANCE.modifiers[this.mtid][0][1]];
                if (!this.visible_options.some(function (x) { return x.moid === base_option.moid; })) {
                  console.error(`the base product's option ${base_option.moid} isn't visible. switching to RADIO modifier display for ${this.mtid}`);
                  this.display_type = MODDISP_RADIO;
                }
                else {
                  this.display_type = MODDISP_TOGGLE;
                  var toggle_on_option = this.visible_options.find(function(x) { return x.moid !== base_option.moid; });
                  console.assert(toggle_on_option, "should have found an option for the toggle!");
                  this.toggle_values = [base_option, toggle_on_option];
                }
                // sets the current single value to the MOID of the current selection
                this.current_single_value = this.selection.modifiers[this.mtid][0][1];
              }
              else {
                this.display_type = MODDISP_RADIO;
                this.current_single_value = this.selection.modifiers[this.mtid][0][1];
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

        this.PostModifyCallback = function (placement, moid) { 
          //console.log(`placement ${placement} of option ${JSON.stringify(moid)}`);
          if (this.display_type === MODDISP_CHECKBOX) {
            if (placement === TOPPING_NONE) {
              delete this.pmenuctrl.modifier_map[this.mtid][moid];
            }
            else {
              if (this.config.MENU.modifiers[this.mtid].modifier_type.min_selected === 0 && 
                this.config.MENU.modifiers[this.mtid].modifier_type.max_selected === 1) {
                // checkbox that requires we unselect any other values since it kinda functions like a radio
                this.pmenuctrl.modifier_map[this.mtid] = { };
              }
              this.pmenuctrl.modifier_map[this.mtid][moid] = placement;
            }
          }
          else { // display_type === MODDISP_TOGGLE || display_type === MODDISP_RADIO
            this.pmenuctrl.modifier_map[this.mtid] = { };
            if (this.display_type === MODDISP_TOGGLE) {
              this.pmenuctrl.modifier_map[this.mtid][this.toggle_values[this.current_single_value].moid] = TOPPING_WHOLE;  
            }
            else {
              this.pmenuctrl.modifier_map[this.mtid][this.current_single_value] = TOPPING_WHOLE;
            }
          }
          this.pmenuctrl.PostModifierChangeCallback(this.mtid, moid, placement);
        };
        this.Initialize();
      },
      template: '\
      <div>{{ctrl.config.MENU.modifiers[ctrl.mtid].modifier_type.name}}:</div> \
      <div class="flexitems"> \
        <div ng-if="ctrl.display_type !== 1" class="flexitem" ng-repeat="option in ctrl.visible_options" wcpoptiondir \
          selection="ctrl.selection" modctrl="ctrl" option="option" config="ctrl.config" allowsplit="ctrl.allowsplit"> \
        </div> \
        <div class="flexitem" ng-if="ctrl.display_type === 1"> \
          <input type="checkbox" id="{{ctrl.toggle_values[1].shortname}}_whole" class="input-whole" \
            ng-disabled="!ctrl.toggle_values[1].IsEnabled(ctrl.selection, ctrl.config.WHOLE, ctrl.config.MENU)" \
            ng-model="ctrl.current_single_value" ng-true-value="1" \
            ng-false-value="0" ng-change="ctrl.PostModifyCallback()"> \
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
      allowsplit: "=allowsplit",
      modctrl: "=modctrl",
    },
    controller: function () {
      this.Initialize = function () {
        this.MENU = this.config.MENU;
        this.split =  this.option.can_split && this.modctrl.display_type === MODDISP_CHECKBOX;
        var placement = GetPlacementFromMIDOID(this.selection, this.option.modifier._id, this.option.moid);
        this.left = placement === TOPPING_LEFT;
        this.right = placement === TOPPING_RIGHT;
        this.whole = placement === TOPPING_WHOLE;
      };

      this.UpdateOption = function (placement) {
        this.modctrl.PostModifyCallback(placement, this.option.moid);
      };

      this.ToggleWhole = function () {
        this.left = this.right = false;
        var new_placement = (+this.right * TOPPING_RIGHT) + (+this.left * TOPPING_LEFT) + (+this.whole * TOPPING_WHOLE);
        this.UpdateOption(new_placement);
      };

      this.ToggleHalf = function () {
        if (this.left && this.right) {
          this.whole = true;
          this.left = this.right = false;
        } else {
          this.whole = false;
        }
        var new_placement = (+this.right * TOPPING_RIGHT) + (+this.left * TOPPING_LEFT) + (+this.whole * TOPPING_WHOLE);
        this.UpdateOption(new_placement);
      };

      this.Initialize();
    },
    controllerAs: 'ctrl',
    bindToController: true,
    template: '<input ng-if="ctrl.modctrl.display_type === 0" id="{{ctrl.option.shortname}}_whole" class="input-whole" ng-model="ctrl.modctrl.current_single_value" ng-value="ctrl.option.moid" ng-disabled="!ctrl.option.IsEnabled(ctrl.selection, ctrl.config.WHOLE, ctrl.MENU)" type="radio" ng-change="ctrl.UpdateOption()"> \
      <input ng-if="ctrl.modctrl.display_type === 2" id="{{ctrl.option.shortname}}_whole" class="input-whole" ng-model="ctrl.whole" ng-disabled="!ctrl.option.IsEnabled(ctrl.selection, ctrl.config.WHOLE, ctrl.MENU)" type="checkbox" ng-change="ctrl.ToggleWhole()"> \
        <input ng-if="ctrl.modctrl.display_type === 2" ng-show="ctrl.split" id="{{ctrl.option.shortname}}_left" class="input-left" ng-model="ctrl.left" ng-disabled="!ctrl.option.IsEnabled(ctrl.selection, ctrl.config.LEFT, ctrl.MENU)" type="checkbox" ng-change="ctrl.ToggleHalf()"> \
        <input ng-if="ctrl.modctrl.display_type === 2" ng-show="ctrl.split" id="{{ctrl.option.shortname}}_right" class="input-right" ng-model="ctrl.right" ng-disabled="!ctrl.option.IsEnabled(ctrl.selection, ctrl.config.RIGHT, ctrl.MENU)" type="checkbox" ng-change="ctrl.ToggleHalf()"> \
        <span class="option-circle-container"> \
        <label for="{{ctrl.option.shortname}}_whole" class="option-whole option-circle"></label> \
        <label ng-if="ctrl.modctrl.display_type === 2" ng-show="ctrl.split" for="{{ctrl.option.shortname}}_left" class="option-left option-circle"></label> \
        <label ng-if="ctrl.modctrl.display_type === 2" ng-show="ctrl.split" for="{{ctrl.option.shortname}}_right" class="option-right option-circle"></label> \
        </span> \
        <label class="topping_text" for="{{ctrl.option.shortname}}_whole" ng-disabled="!ctrl.option.IsEnabled(ctrl.selection, ctrl.config.WHOLE, ctrl.pmenuctrl.CONFIG.MENU)">{{ctrl.option.name}}</label>'
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