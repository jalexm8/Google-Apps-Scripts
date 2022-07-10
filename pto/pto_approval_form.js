function formResponsesToArray() {
    var form = FormApp.getActiveForm();
    var formResponses = form.getResponses();
    var lastResponse = formResponses[formResponses.length - 1].getItemResponses();
    var lineManagerEmail = formResponses[formResponses.length - 1].getRespondentEmail();
    var userEmail = lastResponse[0].getResponse();
    var startDate = lastResponse[1].getResponse();
    var endDate = lastResponse[2].getResponse();
    var requestResponse = lastResponse[3].getResponse();
    var declineReason = lastResponse[4].getResponse();
    var formattedStartDate = new Date(startDate);
    var formattedEndDate = new Date(endDate);
  
    var userResponses = {
      'line manager email': lineManagerEmail,
      'user email': userEmail,
      'start date': formattedStartDate,
      'end date': formattedEndDate,
      'request response': requestResponse,
      'decline reason': declineReason,
      'form start date': startDate,
      'form end date': endDate,
    };
  
    return userResponses;
  }
  
  function errorChecking(startDate, endDate, dataSheet, userRow) {
    /* This function is where you would also add policy specific errors,
    *  such as maximum amount of PTO to take per request etc.
    */
    const PTOREMAININGCOLUMN = 5;
  
    var errorMsg = "";
  
    if ( userRow == null ) {
      errorMsg += "ERROR: User email is not in system."
      return errorMsg;
    }
  
    if ( startDate.getTime() > endDate.getTime() ) {
      errorMsg += "ERROR: End date cannot be before start date.<br>";
    }
  
    var remainingPTO = dataSheet.getRange(userRow, PTOREMAININGCOLUMN).getValue();
    if ( remainingPTO <= 0 ) {
      errorMsg += "ERROR: The user does not have enough PTO remaining to request these dates.<br>";
    }
  
    return errorMsg;
  }
  
  function getUserRow(dataSheet, userEmail) {
    const USEREMAILCOLUMN = 1; //this may not be right.
  
    var sheetValues = dataSheet.getDataRange().getValues();
  
    for ( var i = 0; i < sheetValues.length ; i++) {
      if ( sheetValues[i][USEREMAILCOLUMN] == userEmail) {
        return i+1;
      }
    }
  }
  
  function sendErrorEmail(errorMsg, lineManagerEmail) {
    MailApp.sendEmail({
      to: lineManagerEmail,
      subject: "PTO approval is not valid.",
      htmlBody: "Please see below for possible error messages: <br><br>" + errorMsg
    });
  }
  
  function daysBetweenStartAndEndDate(startDate, endDate) {
    var timeBetween = endDate.getTime() - startDate.getTime();
    var daysBetween = timeBetween / (1000 * 3600 * 24);
  
    return daysBetween + 1;
  }
  
  function removeRequestedDaysFromSpreadsheet(dataSheet, userRow, ptoDaysRequested) {
    const PTOREQUESTEDCOLUMN = 6;
  
    var prevRequestedTotal = dataSheet.getRange(userRow, PTOREQUESTEDCOLUMN).getValue();
    dataSheet.getRange(userRow, PTOREQUESTEDCOLUMN).setValue(prevRequestedTotal - ptoDaysRequested);
  }
  
  function sendUserEmail(userResponses, dataSheet, userRow, ptoDaysRequested) {
    const PTOREMAININGCOLUMN = 5;
  
    var startDate = userResponses['start date'].toLocaleDateString();
    var endDate = userResponses['end date'].toLocaleDateString();
    var remainingPTO = dataSheet.getRange(userRow, PTOREMAININGCOLUMN).getValue();
  
    if ( userResponses['request response'] == "Declined") {
      if ( userResponses['decline reason'] == "" ) {
        var declineReason = "No reason provided.";
      } else {
        var declineReason = userResponses['decline reason'];
      }
      Logger.log(userResponses['decline reason']);
      Logger.log(declineReason);
      MailApp.sendEmail({
        to: userResponses['user email'],
        subject: "Your PTO request has been declined.",
        htmlBody: "Your request to take the below dates as PTO has been declined: <br>" +
                  startDate + " - " + endDate + "<br><br>" +
                  "Total PTO requested: " + ptoDaysRequested + "<br>" +
                  "Decline reason: " + declineReason + "<br><br>" +
                  "Remaining PTO: " + remainingPTO
    });
    } else {
      MailApp.sendEmail({
        to: userResponses['user email'],
        subject: "PTO request has been approved.",
        htmlBody: "Your request to take the below dates as PTO has been approved: <br>" +
                  startDate + " - " + endDate + "<br><br>" +
                  "Total PTO requested: " + ptoDaysRequested + "<br>" +
                  "Remaining PTO: " + remainingPTO
      })
    }
  }
  
  function sendLineManagerEmail(userResponses, ptoDaysRequested) {
    var startDate = userResponses['start date'].toLocaleDateString();
    var endDate = userResponses['end date'].toLocaleDateString();
  
    if ( userResponses['request response'] == "Declined") {
      if ( userResponses['decline reason'] == "" ) {
        var declineReason = "No reason provided.";
      } else {
        var declineReason = userResponses['decline reason'];
      }
      MailApp.sendEmail({
        to: userResponses['line manager email'],
        subject: userResponses['user email'] + "'s PTO request has been declined.",
        htmlBody: "You have declined " + userResponses['user email'] + "'s request to take the below dates as PTO: <br>" +
                  startDate + " - " + endDate + "<br><br>" +
                  "Total PTO requested: " + ptoDaysRequested + "<br>" +
                  "Decline reason: " + declineReason
    });
    } else {
      MailApp.sendEmail({
        to: userResponses['line manager email'],
        subject: userResponses['user email'] + "'s PTO request has been approved.",
        htmlBody: "You have approved " + userResponses['user email'] + "'s request to take the below dates as PTO: <br>" +
                  startDate + " - " + endDate + "<br><br>" +
                  "Total PTO requested: " + ptoDaysRequested
      })
    }
  }
  
  function addApprovedDaysToSpreadSheet(dataSheet, userRow, ptoDaysRequested) {
    const PTOREQUESTEDCOLUMN = 7;
  
    var prevRequestedTotal = dataSheet.getRange(userRow, PTOREQUESTEDCOLUMN).getValue();
    dataSheet.getRange(userRow, PTOREQUESTEDCOLUMN).setValue(prevRequestedTotal + ptoDaysRequested);
  
  
  }
  
  function onFormSubmit(e) {
    var userResponses = formResponsesToArray();
    var spreadSheet = SpreadsheetApp.openById("<SPREADSHEET_ID>");
    var dataSheet = spreadSheet.getSheetByName('data');
    var userRow = getUserRow(dataSheet, userResponses['user email']);
    var errorMsg = errorChecking(userResponses['start date'], userResponses['end date'], dataSheet, userRow);
  
      if ( errorMsg.length > 0 ) {
      sendErrorEmail(errorMsg, userResponses['line manager email']);
    } else {
      var ptoDaysRequested = daysBetweenStartAndEndDate(userResponses['start date'], userResponses['end date']);
  
      removeRequestedDaysFromSpreadsheet(dataSheet, userRow, ptoDaysRequested);
      if ( userResponses['request response'] == "Approved") {
        addApprovedDaysToSpreadSheet(dataSheet, userRow, ptoDaysRequested);
      }
  
      sendLineManagerEmail(userResponses, ptoDaysRequested);
      sendUserEmail(userResponses, dataSheet, userRow, ptoDaysRequested);
    }
  }
  