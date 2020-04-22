var $j = jQuery.noConflict();

var EMAIL_REGEX = new RegExp("^[_A-Za-z0-9\-]+(\\.[_A-Za-z0-9\-]+)*@[A-Za-z0-9\-]+(\\.[A-Za-z0-9\-]+)*(\\.[A-Za-z]{2,})$");

var WARIO_ENDPOINT = "https://wario.windycitypie.com/";
//var WARIO_ENDPOINT = "http://localhost:4001/";

(function () {
  var app = angular.module("WCPOrder", []);

  app.controller('PaymentController', ['$scope', '$http', function ($scope, $http) {
    this.EMAIL_REGEX = EMAIL_REGEX;
    $scope.credit_amount = 50;
    $scope.sender_name = "";
    $scope.recipient_name_first = "";
    $scope.recipient_name_last = "";
    $scope.sender_email_address = "";
    $scope.send_email_to_recipient = false;
    $scope.recipient_email_address = "";
    $scope.recipient_message = "";
    $scope.payment_info = {};
    $scope.isPaymentSuccess = false;
    $scope.isProcessing = false;
    this.triggerBuild = false;


    // stage 6: tip entering, payment
    // stage 7: pressed submit, waiting validation
    // stage 8: submitted successfully
    $scope.stage = 6;

    $scope.isBuilt = false;

    $scope.submitForm = function () {
      if (!$scope.isProcessing) {
        $scope.isProcessing = true;
        $scope.paymentForm.requestCardNonce();
      }
      return false;
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
            $scope.card_errors = errors
            $scope.isProcessing = false;
            $scope.$apply();
          } else {
            $scope.card_errors = []
            $scope.chargeCardWithNonce(nonce);
          }

        },
        unsupportedBrowserDetected: function () {
          alert("Unfortunately, your browser or settings don't allow for pre-payment. Please try on a newer browser.");
        }
      }
    });

    $scope.chargeCardWithNonce = function (nonce) {
      var data = {
        nonce: nonce,
        credit_amount: $scope.credit_amount,
        sender_name: $scope.sender_name,
        recipient_name_first: $scope.recipient_name_first,
        recipient_name_last: $scope.recipient_name_last,
        sender_email_address: $scope.sender_email_address,
        send_email_to_recipient: $scope.send_email_to_recipient,
        recipient_email_address: $scope.recipient_email_address,
        recipient_message: $scope.recipient_message
      };
      $http.post(`${WARIO_ENDPOINT}api/v1/payments/storecredit/stopgap`, data).success(function (data, status) {
        if (status == 200) {
          $scope.isPaymentSuccess = true;
          $scope.stage = 7;
          $scope.wario_response = data;
        }
        else {
          // display server side card processing errors 
          $scope.isPaymentSuccess = false;
          $scope.card_errors = []
          var errors = JSON.parse(data.result);
          for (var i = 0; i < errors.length; i++) {
            $scope.card_errors.push({ message: errors[i].detail })
          }
        }
        $scope.isProcessing = false;
      }).error(function (data) {
        $scope.isProcessing = false;
        $scope.isPaymentSuccess = false;
        if (data && data.result) {
          $scope.card_errors = [];
          var errors = JSON.parse(data.result).errors;
          for (var i = 0; i < errors.length; i++) {
            $scope.card_errors.push({ message: errors[i].detail })
          }
        } else {
          $scope.card_errors = [{ message: "Processing error, please try again! If you continue to have issues, text us." }];
        }
      });
    }
    $scope.buildForm = function () {
      if (!$scope.isBuilt) {
        $scope.isBuilt = true;
        $scope.paymentForm.build();
      }
      return $scope.isBuilt;
    };

    this.UpdateInfo = function () {
      if ($scope.credit_amount >= 2.00 && 
        $scope.sender_name && $scope.sender_name.length > 2 && 
        $scope.recipient_name_first && $scope.recipient_name_first.length > 2 && 
        $scope.recipient_name_last && $scope.recipient_name_last.length > 1 && 
        $scope.sender_email_address && $scope.sender_email_address.length > 5) {
        this.triggerBuild = true;
      }
      //$scope.send_email_to_recipient = false;
      //$scope.recipient_email_address = "";
      //$scope.recipient_message = "";
    };

    this.updateCreditAmount = function() {
      $scope.credit_amount = $scope.credit_amount ? parseFloat(Number($scope.credit_amount).toFixed(2)) : 50.00;
      $scope.credit_amount = $scope.credit_amount < 2.00 ? 2.00 : $scope.credit_amount;
      this.UpdateInfo();
    }

  }]);

  $j("span.sender_email_address input").on("blur", function (event) {
    $j(this).mailcheck({
      suggested: function (element, suggestion) {
        $j("div.sender-email-tip").html("Did you mean <b><i>" + suggestion.full + "</i></b>?");
      },
      empty: function (element) {
        $j("div.sender-email-tip").html("");
      }
    });
  });
  $j("span.recipient_email_address input").on("blur", function (event) {
    $j(this).mailcheck({
      suggested: function (element, suggestion) {
        $j("div.recipient-email-tip").html("Did you mean <b><i>" + suggestion.full + "</i></b>?");
      },
      empty: function (element) {
        $j("div.recipient-email-tip").html("");
      }
    });
  });
})();