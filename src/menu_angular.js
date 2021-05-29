var TOPPING_NONE = WCPShared.TOPPING_NONE;
var TOPPING_LEFT = WCPShared.TOPPING_LEFT;
var TOPPING_RIGHT = WCPShared.TOPPING_RIGHT;
var TOPPING_WHOLE = WCPShared.TOPPING_WHOLE;

var GetPlacementFromMIDOID = WCPShared.GetPlacementFromMIDOID;
var DisableDataCheck = WCPShared.DisableDataCheck;
var FilterProduct = WCPShared.FilterProduct
var FilterWMenu = WCPShared.FilterWMenu;

var $j = jQuery.noConflict();


var FilterModifiersCurry = function (menu) {
  return function (mods) {
    var result = {};
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
  };
}

var ProductHasSelectableModifiers = function(pi, menu) {
  return Object.keys(FilterModifiersCurry(menu)(pi.modifier_map)).length > 0;
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

var WCPStoreConfig = function () {

  // option placement enums
  this.NONE = TOPPING_NONE;
  this.LEFT = TOPPING_LEFT;
  this.RIGHT = TOPPING_RIGHT;
  this.WHOLE = TOPPING_WHOLE;


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

  this.MENU_CATID = MENU_CATID;
  // END menu related

  this.UpdateCatalog = function (cat) {
    console.log(cat);
    if (cat.version === this.MENU.version) {
      return;
    }
    var catalog_map = new WCPShared.WMenu(cat);
    var current_time = moment();
    var FilterProdsFxn = function(item) { return FilterProduct(item, catalog_map, function(x) { return x.hide_from_menu; }, current_time); };
    FilterWMenu(catalog_map, FilterProdsFxn, current_time);
    Object.assign(this.MENU, catalog_map);
    console.log(this.MENU);
  }
  //END WCP store config
};

var wcpconfig = new WCPStoreConfig();

(function () {
  var app = angular.module("WARIOMenu", ['ngSanitize', 'ngMaterial', 'btford.socket-io']);

  app.filter('TrustAsHTML', ['$sce', function ($sce) {
    return function (val) {
      return $sce.trustAsHtml(val);
    };
  }]);
  
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


  app.controller("WMenuCtrl", ["$rootScope", "socket",
    function ($rootScope, $socket) {
      this.CONFIG = $rootScope.CONFIG = wcpconfig;
      this.ScrollTop = ScrollTopJQ;
      this.ScrollToID = ScrollToEIdJQ;

      this.display_menu = [];

      this.InitializeMenu = function() {
        // local access to wmenu
        var WMENU = this.CONFIG.MENU;
        // get all categories that are children of MENU_CATID
        var MENU_CATEGORIES = WMENU.categories[MENU_CATID].children;
        // if any of the children have children categories, this is a tabbed menu, otherwise single page
        var is_tabbed_menu = MENU_CATEGORIES.reduce(function(acc, child_id) { return acc || WMENU.categories[child_id].children.length > 0; }, false);
        if (is_tabbed_menu) {
          // e.g.: [FOOD: [SMALL PLATES, PIZZAS], COCKTAILS: [], WINE: [BUBBLES, WHITE, RED, PINK]]
          // create a menu from the filtered categories and products.
          this.display_menu = MENU_CATEGORIES.map(function(cat_id) { return { active: false, cat_id: cat_id };})
          if (this.display_menu.length > 0) {
            this.display_menu[0].active = true;
          }  
        }
        else {
          // e.g.: [SMALL PLATES, PIZZAS]
          this.display_menu = [ {active: true, cat_id: MENU_CATID}]
        }
      }
    
      var UpdateCatalogFxn = function (message) {
        this.CONFIG.UpdateCatalog(message);
        this.InitializeMenu();
      };
      var UpdateCatalogFxn = UpdateCatalogFxn.bind(this);
      $socket.on("WCP_CATALOG", UpdateCatalogFxn);
    }]);


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
          return !this.prod.display_flags.suppress_exhaustive_modifier_list && !(this.prod.options_sections.length === 1 && this.prod.options_sections[0][1] === this.prod.processed_name)
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
        '<h4 class="menu-list__item-title"><span class="item_title">{{ctrl.prod.processed_name}}</span><span ng-if="ctrl.dots" class="dots"></span></h4>' +
        '<p ng-if="ctrl.description && ctrl.prod.processed_description" class="menu-list__item-desc">' +
        '<span class="desc__content">' +
        '<span>{{ctrl.prod.processed_description}}</span>' +
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

})();