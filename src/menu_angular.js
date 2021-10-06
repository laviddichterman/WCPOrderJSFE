var FilterProduct = WCPShared.FilterProduct;
var FilterWMenu = WCPShared.FilterWMenu;
var ComputePotentialPrices = WCPShared.ComputePotentialPrices;

var WCPStoreConfig = function () {
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
    if (cat.version === this.MENU.version) {
      return;
    }
    var catalog_map = new WCPShared.WMenu(cat);
    var current_time = moment();
    var FilterProdsFxn = function(item) { return FilterProduct(item, catalog_map, function(x) { return x.menu.hide; }, current_time); };
    FilterWMenu(catalog_map, FilterProdsFxn, current_time);
    Object.assign(this.MENU, catalog_map);
  };
  //END WCP store config
};

var wcpconfig = new WCPStoreConfig();

(function () {
  var app = angular.module("WARIOMenu", ['ngSanitize', 'btford.socket-io']);

  app.filter('TrustAsHTML', ['$sce', function ($sce) {
    return function (val) {
      return $sce.trustAsHtml(val);
    };
  }]);
  
  app.factory('socket', function ($rootScope) {
    var socket = io(`${WARIO_ENDPOINT}nsRO`, {
      transports: ["websocket", "polling"]
    });
    socket.on("connect_error", function() {
      // revert to classic upgrade
      console.log("Reverting to polling first socketio transport");
      socket.io.opts.transports = ["polling", "websocket"];
    });
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
      this.active = 0;
      this.display_menu = [];

      this.InitializeMenu = function() {
        var previous_menu_length = this.display_menu.length;
        // local access to wmenu
        var WMENU = this.CONFIG.MENU;
        // get all categories that are children of MENU_CATID
        var MENU_CATEGORIES = WMENU.categories[MENU_CATID].children;
        // if any of the children have children categories, this is a tabbed menu, otherwise single page
        var is_tabbed_menu = MENU_CATEGORIES.reduce(function(acc, child_id) { return acc || WMENU.categories[child_id].children.length > 0; }, false);
        if (is_tabbed_menu) {
          // e.g.: [FOOD: [SMALL PLATES, PIZZAS], COCKTAILS: [], WINE: [BUBBLES, WHITE, RED, PINK]]
          // create a menu from the filtered categories and products.
          this.display_menu = MENU_CATEGORIES;
        }
        else {
          // e.g.: [SMALL PLATES, PIZZAS]
          this.display_menu = [ MENU_CATID ];
        }
        if (this.display_menu.length !== previous_menu_length) {
          this.active = 0;
        }
        console.log(this.display_menu);
      };
      
      this.setActive = function(idx) { 
        this.active = idx;
      };

      var UpdateCatalogFxn = function (message) {
        this.CONFIG.UpdateCatalog(message);
        this.InitializeMenu();
      };
      var BoundUpdateCatalogFxn = UpdateCatalogFxn.bind(this);
      $socket.on("WCP_CATALOG", BoundUpdateCatalogFxn);
    }]);


  app.directive("wcppizzacartitem", function () {
    return {
      restrict: "E",
      scope: {
        prod: "=prod",
        menu: "=menu",
        dots: "=dots",
        price: "=price",
        displayctx: "@displayctx",
        allowadornment: "=allowadornment",
        description: "=description"
      },
      controller: function () { 
        this.ShowOptionsSections = function () {
          return !this.prod.display_flags[this.displayctx].suppress_exhaustive_modifier_list && !(this.prod.options_sections.length === 1 && this.prod.options_sections[0][1] === this.prod.processed_name);
        };
        this.ShowAdornment = function () {
          return this.allowadornment && this.prod.display_flags[this.displayctx].adornment ? this.prod.display_flags[this.displayctx].adornment : false; 
        };
        this.PriceText = function () {
          if (this.prod.incomplete) {
            switch (this.prod.display_flags[this.displayctx].price_display) {
              case "FROM_X": return `from ${this.prod.price}`;
              case "VARIES": return "MP";
              case "MIN_TO_MAX": {
                var prices = ComputePotentialPrices(this.prod, this.menu); 
                return prices.length > 1 && prices[0] !== prices[prices.length-1] ? `from ${prices[0]} to ${prices[prices.length-1]}` : `${prices[0]}`;
              }
              case "LIST": return ComputePotentialPrices(this.prod, this.menu).join("/");
              case "ALWAYS": default: return `${this.prod.price}`;
            }
          }
          return `${this.prod.price}`;
        };
      },
      controllerAs: "ctrl",
      bindToController: true,
      template: '<div ng-class="{\'menu-list__item-highlight-wrapper\': ctrl.ShowAdornment()}">'+
        '<span ng-if="ctrl.ShowAdornment()" class="menu-list__item-highlight-title" ng-bind-html="ctrl.ShowAdornment() | TrustAsHTML"></span>' +
        '<h4 class="menu-list__item-title"><span class="item_title">{{ctrl.prod.processed_name}}</span><span ng-if="ctrl.dots" class="dots"></span></h4>' +
        '<p ng-if="ctrl.description && ctrl.prod.processed_description" class="menu-list__item-desc">' +
        '<span class="desc__content">' +
        '<span ng-bind-html="ctrl.prod.processed_description | TrustAsHTML"></span>' +
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

  app.directive("wcpmenumodifiers", function () {
    return {
      restrict: "E",
      scope: {
        prod: "=prod",
        menu: "=menu",
      },
      controller: function () { 
      },
      controllerAs: "ctrl",
      bindToController: true,
      template: '<li class="menu-list__item modifier-section" ng-repeat="mod_def in ctrl.prod.PRODUCT_CLASS.modifiers">\
      <h4 class="menu-list__item-title">{{ctrl.menu.modifiers[mod_def.mtid].modifier_type.display_name ? ctrl.menu.modifiers[mod_def.mtid].modifier_type.display_name : ctrl.menu.modifiers[mod_def.mtid].modifier_type.name}}\
      </h4>\
      <div class="menu-list ">\
        <ul class="flexitems menu-list__items">\
          <li ng-repeat="opt in ctrl.menu.modifiers[mod_def.mtid].options_list" class="flexitem menu-list__item">\
            <p class="menu-list__item-desc"><span class="desc__content">{{opt.name}}</span><span class="menu-list__item-price">{{opt.price ? opt.price : "No Charge"}}</span></p>\
          </li>\
        </ul>\
      </div>\
    </li>',
    };
  });

})();