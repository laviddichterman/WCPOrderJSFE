<?php
/**
 * @package WCPConfigurator
 * @version 1.1.0
 */
/*
Plugin Name: WCPConfigurator
Plugin URI: https://windycitypie.com/
Description: Stores configuration data and provides shortcodes for inclusion in posts
Author: Dave Lichterman
Version: 1.1.0
Author URI: http://lavid.me/
*/

defined( 'ABSPATH' ) or die( 'No script kiddies please!' );

add_action( 'admin_menu', 'WCP_add_admin_menu' );
add_action( 'admin_init', 'WCP_settings_init' );


function WCP_add_admin_menu(  ) {

  add_menu_page( 'WCPOrderConfig', 'WCPOrderConfig', 'wcp_setting', 'wcporderconfig', 'WCP_options_page' );

}

function WCP_settings_capability(){
  return 'wcp_setting';
}

add_filter( 'option_page_capability_wcpOptionGroup', 'WCP_settings_capability');

function WCP_settings_init(  ) {

  register_setting( 'wcpOptionGroup', 'WCP_settings' );

  add_settings_section(
    'WCP_wcpOptionGroup_section',
    __( 'Windy City Pie Order Configuration', 'wordpress' ),
    'WCP_settings_section_callback',
    'wcpOptionGroup'
  );

  add_settings_field(
    'WCP_leadtime_pickup_field',
    __( 'Single pizza lead time', 'wordpress' ),
    'WCP_leadtime_field_render',
    'wcpOptionGroup',
    'WCP_wcpOptionGroup_section'
  );

  add_settings_field(
    'WCP_incremental_leadtime_field',
    __( 'Additional lead time per pizza beyond the first', 'wordpress' ),
    'WCP_incremental_leadtime_field_render',
    'wcpOptionGroup',
    'WCP_wcpOptionGroup_section'
  );

  add_settings_field(
    'WCP_time_step_field',
    __( 'Time step', 'wordpress' ),
    'WCP_time_step_field_render',
    'wcpOptionGroup',
    'WCP_wcpOptionGroup_section'
  );

  add_settings_field(
    'WCP_time_off_field',
    __( 'Blocked off times', 'wordpress' ),
    'WCP_time_off_field_render',
    'wcpOptionGroup',
    'WCP_wcpOptionGroup_section'
  );

  // $default_options = array(
  //     "WCP_leadtime_field" => "[35, 35, 60*24]",
  //     "WCP_incremental_leadtime_field_render" => 5,
  //     "WCP_time_step_field_render" => 15,
  //     "WCP_time_off_field_render" => "[[], [], []]",
  //   );
  //   echo $default_options;
  // add_option('WCP_settings', $default_options);
}


//leadtime is Array<int, int, int>
function WCP_leadtime_field_render(  ) {
  $options = get_option( 'WCP_settings' );
  ?>
  <div ng-controller="LeadTimeController as leadCtrl">
    <label ng-repeat="service in leadCtrl.SERVICE_TYPES track by $index">
      {{service[0]}}:
      <input type="text" ng-model="leadCtrl.leadtime[$index]" ng-change="leadCtrl.update()"><br />
    </label>
    <input style="display:none;" class="leadtime" type='text' ng-model="leadCtrl.leadtime_text" name='WCP_settings[WCP_leadtime_field]' value='<?php echo $options['WCP_leadtime_field']; ?>'>
  </div>

  <?php
}
function WCP_incremental_leadtime_field_render(  ) {
  $options = get_option( 'WCP_settings' );
  ?>
  <input type='text' name='WCP_settings[WCP_incremental_leadtime_field]' value='<?php echo $options['WCP_incremental_leadtime_field']; ?>'>
  <?php
}

function WCP_time_step_field_render(  ) {
  $options = get_option( 'WCP_settings' );
  ?>
  <input type='text' name='WCP_settings[WCP_time_step_field]' value='<?php echo $options['WCP_time_step_field']; ?>'>
  <?php
}

//new Date(2017,1,5),[[14.5*60, 15*60]]
//time off is Array<Array<Tuple<Date, Array<Tuple<int, int>>>>>
function WCP_time_off_field_render(  ) {
  $options = get_option( 'WCP_settings' );
  ?>
  <div ng-repeat="service_interval in daysCtrl.time_off track by $index">
    <b>{{daysCtrl.SERVICE_TYPES[$index][0]}}</b>
    <div ng-repeat="day_interval in service_interval track by $index">
      {{day_interval[0] | date:'EEEE, MMMM dd, yyyy'}}
      <span ng-repeat="interval in day_interval[1] track by $index">
        <br>
        <span>from {{interval[0] | MinutesToPrintTime}} to {{interval[1] | MinutesToPrintTime}}</span>
        <button type="button" class="btn button-remove" ng-click="daysCtrl.remove_interval($parent.$parent.$index, $parent.$index, $index)">x</button>
      </span>
    </div>
  </div>

  <label ng-repeat="service in daysCtrl.time_off_service track by $index">
    {{daysCtrl.SERVICE_TYPES[$index][0]}}:
    <input type="checkbox" ng-model="daysCtrl.time_off_service[$index]" ng-change="daysCtrl.update_date_interval_input()">
  </label><br />
  <input ng-disabled="!daysCtrl.someservice_selected" type="text" name="interval-date" value="" size="40" ng-model="daysCtrl.time_off_date_input" jqdate ng-change="daysCtrl.update_date_interval_input()">
  <select ng-if="daysCtrl.time_off_window_lower_options.length > 0" name="lower-time" ng-model="daysCtrl.time_off_window_lower_input" ng-options="servicetime | MinutesToPrintTime for servicetime in daysCtrl.time_off_window_lower_options" ng-change="daysCtrl.update_time_off_upper_options()">
  </select>
  <select ng-if="daysCtrl.time_off_window_upper_options.length > 0" name="upper-time" ng-model="daysCtrl.time_off_window_upper_input" ng-options="servicetime | MinutesToPrintTime for servicetime in daysCtrl.time_off_window_upper_options">
  </select>
  <button ng-if="daysCtrl.time_off_window_upper_input != ''" type="button" class="btn button-remove" ng-click="daysCtrl.add_interval()">Add</button>
  <input style="display:none;" class="timeoff" type='text' name='WCP_settings[WCP_time_off_field]' value='<?php echo $options['WCP_time_off_field']; ?>'>
  <?php
}


function WCP_settings_section_callback(  ) {
  echo __( 'Edit the Windy City Pie order page configuration', 'wordpress' );
}


function WCP_options_page(  ) {
  $options = get_option( 'WCP_settings' );
  ?>
  <form action='options.php' method='post'>

    <h2>WCPOrderConfig</h2>
    <link rel="stylesheet" href="http://windycitypie.com/wp-content/plugins/contact-form-7/includes/js/jquery-ui/themes/smoothness/jquery-ui.min.css?ver=1.10.3">
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.5.6/angular.min.js"></script>
    <script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha256-ZosEbRLbNQzLpnKIkEdrPv7lOy9C27hHQ+Xp8a4MxAQ=" crossorigin="anonymous"></script>
    <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js" integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU=" crossorigin="anonymous"></script>
    <script>
    var $j = jQuery.noConflict();
    (function() {

      //TODO: refactor out into shared config
      //TODO: add override hours
      var PICKUP_HOURS = [
        [11*60, 22*60], //sunday
        [11*60, 22*60], //monday
        [11*60, 22*60], //tuesday
        [11*60, 22*60], //wednesday
        [11*60, 22*60], //thursday
        [11*60, 23*60], //friday
        [11*60, 23*60]  //saturday
      ];

      //TODO: refactor out into shared config
      var PICKUP = 0;
      var DINEIN = 1;
      var CATERING = 2;
      var SERVICE_TYPES = [
        ["Pickup", PICKUP],
        ["Dine-In", DINEIN],
        ["Catering", CATERING],
      ];

      function CompareDates(a, b) {
        return (a.getTime() < b.getTime() ? -1 : (a.getTime() > b.getTime() ? 1 : 0));
      }

      function ExtractCompareDate(a, b) {
        return CompareDates(a[0], b[0]);
      }

      function CompareIntervals(a, b) {
        // compares the starting time of two intervals
        return (a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0));
      }

      function IsSameDay(date1, date2) {
        return date1.getDate() == date2.getDate() && date1.getFullYear() == date2.getFullYear() && date1.getMonth() == date2.getMonth();
      }

      function MinutesToPrintTime(minutes) {
        if(isNaN(minutes) || minutes < 0) {
          return minutes;
        }
        var hour = Math.floor(minutes / 60);
        var minute = minutes - (hour * 60);
        var meridian = hour >= 12 ? "PM" : "AM";
        var printHour = (hour % 12 === 0 ? 12 : hour % 12).toString();
        var printMinute = (minute < 10 ? "0" : "").concat(minute.toString());
        return printHour.concat(":").concat(printMinute + meridian);
      }

      var app = angular.module("WCPConfigurator", []);

      app.filter("MinutesToPrintTime", function() {
        return MinutesToPrintTime;
      });

      app.controller("LeadTimeController", function() {
        this.SERVICE_TYPES = SERVICE_TYPES;
        this.leadtime = <?php echo $options['WCP_leadtime_field']; ?>;
        this.leadtime_text = "<?php echo $options['WCP_leadtime_field']; ?>";
        this.update = function() {
          this.leadtime_text = "[" + this.leadtime.join(",") + "]";
        }
      });

      app.controller("DaysOffController", function() {
        this.SERVICE_TYPES = SERVICE_TYPES;

        this.time_step = <?php echo $options['WCP_time_step_field']; ?>;
        this.date_input = "";

        this.time_off = <?php echo $options['WCP_time_off_field']; ?>;
        this.time_off_service = [true, true, true]; // TODO: create array from size of SERVICE_TYPES
        this.someservice_selected = true;
        this.time_off_date_input = "";
        this.time_off_window_lower_input = "";
        this.time_off_window_upper_input = "";
        this.time_off_window_lower_options = [];
        this.time_off_window_upper_options = [];


        this.GetBlockedOffForDateAndServices = function(services, date) {
          var blocked_off = [];
          for (var i in services) {
            if (services[i] == true) {
              for (var j in this.time_off[i]) {
                if (IsSameDay(this.time_off[i][j][0], date)) {
                  blocked_off = blocked_off.concat(this.time_off[i][j][1]);
                  break;
                }
              }
            }
          }
          blocked_off.sort(CompareIntervals);
          return blocked_off;
        };

        this.HandleBlockedOffTime = function(blockedOff, time) {
          // param: blockedOff - the blocked off times for the date being processed
          // param: time - the minutes since the day started
          // return: time if time isn't blocked off, otherwise the next available time
          var pushedTime = time;
          for (var i in blockedOff) {
            if (blockedOff[i][1] >= pushedTime && blockedOff[i][0] <= pushedTime) {
                pushedTime = blockedOff[i][1] + this.time_step;
            }
          }
          return pushedTime;
        };

        this.GetAvailableForDate = function(date) {
          var blocked_off = this.GetBlockedOffForDateAndServices(this.time_off_service, date);
          var minmax = PICKUP_HOURS[date.getDay()];
          if (minmax[0] >= minmax[1] || (!this.time_off_service[0] && !this.time_off_service[1] && !this.time_off_service[2])) {
            return [];
          }
          if (blocked_off.length === 0) {
            return [minmax];
          }
          var earliest = this.HandleBlockedOffTime(blocked_off, minmax[0]);
          var current_interval = [earliest, earliest];
          var intervals = [];
          while (earliest <= minmax[1]) {
            var next_time = this.HandleBlockedOffTime(blocked_off, earliest + this.time_step);
            if (next_time != earliest + this.time_step || next_time > minmax[1]) {
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

        this.GetEndIntervalForStart = function(intervals, start) {
          for (var i in intervals) {
            if (start >= intervals[i][0] && start <= intervals[i][1]) {
              return intervals[i][1];
            }
          }
          // should never reach this point
          alert("BUG!");
        }
        this.add_interval_internal = function(service, parsed_date, interval) {
          for (var i in this.time_off[service]) {
            if (IsSameDay(this.time_off[service][i][0], parsed_date)) {
              this.time_off[service][i][1].push(interval);
              this.time_off[service][i][1].sort(CompareIntervals);
              return;
            }
          }
          this.time_off[service].push([parsed_date, [interval]]);
          this.time_off[service].sort(ExtractCompareDate);
        }

        this.add_interval = function() {
          var parsed_date = new Date(this.time_off_date_input);
          var interval = [parseInt(this.time_off_window_lower_input, 10), parseInt(this.time_off_window_upper_input, 10)];
          for (var i in this.time_off_service) {
            if (this.time_off_service[i]) {
              this.add_interval_internal(i, parsed_date, interval);
            }
          }
          this.time_off_date_input = "";
          this.time_off_window_lower_input = "";
          this.time_off_window_upper_input = "";
          this.time_off_window_lower_options = [];
          this.time_off_window_upper_options = [];
          this.time_off_service = [true, true, true];
          this.someservice_selected = true;
        }

        this.update_date_interval_input = function() {
          this.time_off_window_lower_options = [];
          this.time_off_window_upper_options = [];
          this.time_off_window_lower_input = "";
          this.time_off_window_upper_input = "";
          this.someservice_selected = false;
          for (var i in this.time_off_service) {
            this.someservice_selected = this.someservice_selected || this.time_off_service[i];
          }
          var parsed_date = Date.parse(this.time_off_date_input);
          if (isNaN(parsed_date) || !this.someservice_selected) {
            this.time_off_date_input = "";
            return;
          }
          parsed_date = new Date(parsed_date);
          var intervals = this.GetAvailableForDate(parsed_date);
          if (intervals.length === 0) {
            this.time_off_date_input = "";
            return;
          }
          for(var i in intervals) {
            var minmax = intervals[i];
            var earliest = minmax[0];
            while (earliest <= minmax[1]) {
              this.time_off_window_lower_options.push(earliest);
              earliest = earliest + this.time_step;
            }
          }
        };

        this.update_time_off_upper_options = function() {
          this.time_off_window_upper_options = [];
          this.time_off_window_upper_input = "";
          var earliest = parseInt(this.time_off_window_lower_input);
          if (earliest === NaN) {
            this.time_off_window_upper_options = [];
          }
          var parsed_date = new Date(this.time_off_date_input);
          var intervals = this.GetAvailableForDate(parsed_date);
          var end = this.GetEndIntervalForStart(intervals, earliest);
          while (earliest <= end) {
            this.time_off_window_upper_options.push(earliest);
            earliest = earliest + this.time_step;
          }
        }

        this.remove_interval = function(service, day_index, interval_index) {
          this.time_off[service][day_index][1].splice(interval_index, 1);
          if (this.time_off[service][day_index][1].length === 0) {
            this.time_off[service].splice(day_index, 1);
          }
        }
      });

      app.directive("jqdate", function() {
        return {
          restrict: "A",
          require: "ngModel",
          link: function(scope, element, attrs, ctrl) {
            $j(element).datepicker({
              dateFormat: "DD, MM dd, yy",
              minDate: 0,
              onSelect: function(date) {
                ctrl.$setViewValue(date);
                ctrl.$render();
                scope.$apply();
              }
            });
          }
        };
      });

      app.directive("wcpcfgbridge", function() {
        return {
          restrict: "A",
          scope: {
            daysoff: "=daysoff",
          },
          link: function(scope, element, attrs) {
            scope.$watch("daysoff.time_off", function() {
              // version 1.1: updated to handle service types
              var svc_config_strings = [];
              for (var k in scope.daysoff.time_off) {
                var cfg_strings = [];
                for (var i in scope.daysoff.time_off[k]) {
                  var date_interval = scope.daysoff.time_off[k][i];
                  var intervals = [];
                  for (var j in date_interval[1]) {
                    intervals.push("[" + date_interval[1][j][0] + "," + date_interval[1][j][1] + "]");
                  }
                  var cfg = "[new Date(" + date_interval[0].getFullYear() + "," + date_interval[0].getMonth() + "," + date_interval[0].getDate() + "),[" + intervals.join(",") + "]]";
                  cfg_strings.push(cfg);
                }
                svc_config_strings.push("[" + cfg_strings.join(",") + "]");
              }
              var cfg_string = "[" + svc_config_strings.join(",") + "]";
              $j(element).find("input.timeoff").val(cfg_string);
            }, true);
          }
        };
      });
    })();
    </script>
    <div class="ordercfg" ng-app="WCPConfigurator" ng-controller="DaysOffController as daysCtrl">
      <div wcpcfgbridge daysoff="daysCtrl">
      <?php
      settings_fields( 'wcpOptionGroup' );
      do_settings_sections( 'wcpOptionGroup' );
      submit_button();
      ?>
      </div>
    </div>

  </form>
  <?php

}

// Add Shortcode for leadtime
function WCP_leadtime() {
  $options = get_option( 'WCP_settings' );
  return strval($options['WCP_leadtime_field']);
}
add_shortcode( 'WCP_leadtime', 'WCP_leadtime' );

// Add Shortcode for incremental leadtime
function WCP_incremental_leadtime() {
  $options = get_option( 'WCP_settings' );
  return strval($options['WCP_incremental_leadtime_field']);
}
add_shortcode( 'WCP_incremental_leadtime', 'WCP_incremental_leadtime' );

// Add Shortcode for time step
function WCP_time_step() {
  $options = get_option( 'WCP_settings' );
  return strval($options['WCP_time_step_field']);
}
add_shortcode( 'WCP_time_step', 'WCP_time_step' );

// Add Shortcode for time off
function WCP_time_off() {
  $options = get_option( 'WCP_settings' );
  return strval($options['WCP_time_off_field']);
}
add_shortcode( 'WCP_time_off', 'WCP_time_off' );

// Add Shortcode for javascript time object creation
function WCP_blog_epoch_time() {
  return current_time('Y') . ", " . (string)((int)(current_time('n')) - 1) . current_time(', j, G, i, s');
}
add_shortcode( 'WCP_blog_epoch_time', 'WCP_blog_epoch_time' );

?>
