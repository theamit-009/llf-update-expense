const express = require('express');
const pool = require('../db/dbConfig');
const verify = require('../config/verifyToken');
const format = require('pg-format');
const Router = require('express-promise-router');
const router = new Router();

router.get('/expenseApprovals',verify, (request, response) => {
    let objUser = request.user;
    response.render('./approvals/expenseApprovals',{objUser});

});


router.get('/expenseApprovalsList',verify, (request, response) => {
    let objUser = request.user;
    pool.query('SELECT sfid, Submitter__c, status__c, createddate,record_name__c, amount__c, expense__c FROM salesforce.Custom_Approval__c WHERE Approval_Type__c = $1 AND Assign_To__c = $2 ',['Expense', objUser.sfid])
    .then((customApprovalResult) => {
            console.log('customApprovalResult  : '+JSON.stringify(customApprovalResult.rows));
            if(customApprovalResult.rowCount > 0)
            {
                let lstApprovalRecords = [];
                for(let i=0, len = customApprovalResult.rows.length ; i < len ; i++ )
                {
                    let crDate = new Date(customApprovalResult.rows[i].createddate);
                    crDate.setHours(crDate.getHours() +5 );
                    crDate.setMinutes(crDate.getMinutes() + 30 );
                    let strDate = crDate.toLocaleString();
                    let obj = {};
                    obj.sequence = (i+1);
                    obj.recordName = '<a href="#" data-toggle="modal" data-target=""  id="name'+customApprovalResult.rows[i].expense__c+'" class="expnseRecordName" >'+customApprovalResult.rows[i].record_name__c+'</a>';
                    obj.currentStatus = customApprovalResult.rows[i].status__c;
                    obj.totalAmount = customApprovalResult.rows[i].amount__c;
                    obj.createdDate = strDate;

                    obj.approveBtn = '<button class="btn btn-primary approvalButton"  id="Approved-'+customApprovalResult.rows[i].expense__c+'@'+customApprovalResult.rows[i].sfid+'" >Approve</button>';
                    obj.rejectBtn = '<button class="btn btn-danger approvalButton"  id="Rejected-'+customApprovalResult.rows[i].expense__c+'@'+customApprovalResult.rows[i].sfid+'" >Reject</button>';
                    lstApprovalRecords.push(obj);
                }
                response.send(lstApprovalRecords);
            }
            else
                response.send([]);
    })
    .catch((customApprovalError) => {
            console.log('customApprovalError  : '+customApprovalError.stack);
            response.send([]);
    });

});



router.get('/pldFormApprovals',verify, (request, response) => {
    let objUser = request.user;
    response.render('./approvals/pldFormApprovals',{objUser});

});



router.get('/pldFormsApprovalList', verify, (request, response) => {
    let objUser = request.user;

    pool.query('SELECT app.Submitter__c, app.status__c, app.createddate, app.record_name__c, app.expense__c, pldresp.name FROM salesforce.Custom_Approval__c as app INNER JOIN salesforce.Project_Survey_Response__c as pldresp ON app.expense__c = pldresp.sfid WHERE Approval_Type__c = $1 AND Assign_To__c = $2 ',['PldForm', objUser.sfid])
    .then((customApprovalResult) => {
            console.log('customApprovalResult  : '+JSON.stringify(customApprovalResult.rows));
            if(customApprovalResult.rowCount > 0)
            {
                let lstApprovalRecords = [];
                for(let i=0, len = customApprovalResult.rows.length ; i < len ; i++ )
                {
                    let crDate = new Date(customApprovalResult.rows[i].createddate);
                    crDate.setDate(crDate.getDate() + 5);
                    crDate.setMinutes(crDate.getMinutes() + 30);
                    let strDate = crDate.toLocaleString();
                    let obj = {};
                    obj.sequence = (i+1);
                    obj.recordName = '<a href="https://llfdev1-llf1.cs74.force.com/responsepdf?Id='+customApprovalResult.rows[i].expense__c+'" target="_blank"  id="name'+customApprovalResult.rows[i].expense__c+'" class="pldResponseName" >'+customApprovalResult.rows[i].name+'</a>';
                    obj.currentStatus = customApprovalResult.rows[i].status__c;
                    obj.createdDate = strDate;
                    obj.approveBtn = '<button class="btn btn-primary approveResponse" id="approve'+customApprovalResult.rows[i].expense__c+'"  >Approve</button>';
                    obj.rejectBtn = '<button class="btn btn-danger rejectResponse" id="reject'+customApprovalResult.rows[i].expense__c+'" >Reject</button>';
                    lstApprovalRecords.push(obj);
                }
                response.send(lstApprovalRecords);
            }
            else
                response.send([]);
    })
    .catch((customApprovalError) => {
            console.log('customApprovalError  : '+customApprovalError.stack);
            response.send([]);
    });


});



router.post('/pldApprovalFeedback',verify, async(request,response) => {

    let objUser = request.user;
    console.log('Hello Approval  ');
    let body = request.body;
    let statusToSet = '';
    if(body.type == 'approve')
    {
        statusToSet = 'Approved';
    }
    else
    {
        statusToSet = 'Rejected';
    }
    console.log('statusToSet  : '+statusToSet);
    
    await
    pool
    .query('UPDATE salesforce.Project_Survey_Response__c SET Approval_Status__c = $1 WHERE sfid = $2',[statusToSet, body.responseId])
    .then((surveyResponseQueryResult) =>{
          console.log('surveyResponseQueryResult  : '+JSON.stringify(surveyResponseQueryResult));
    })
    .catch((surveyResponseQueryError) =>{
        console.log('surveyResponseQueryError  : '+surveyResponseQueryError);
    })



    let updateQueryText = 'UPDATE salesforce.Custom_Approval__c SET  '+
                          'status__c = \''+statusToSet+'\' '+
                          'WHERE Assign_To__c = $1 AND Approval_Type__c = $2 AND expense__c = $3 ';

    console.log('updateQueryText  : '+updateQueryText);
    console.log('objUser.Id  :  '+objUser.Id+' body.responseId  : '+body.responseId);
    await
    pool
    .query(updateQueryText,[objUser.sfid, 'PldForm', body.responseId])
    .then((approvalFeedbackResult) => {
            console.log('approvalFeedbackResult  '+JSON.stringify(approvalFeedbackResult));
            response.send('Success');
    })
    .catch((approvalFeedbackError) => {
        console.log('approvalFeedbackError  '+approvalFeedbackError.stack);
        response.send('Error');
    })



 
});


router.post('/handleExpenseApproval', verify, async (request, response) =>{

    let objUser = request.user;
    console.log('objUser  : '+JSON.stringify(objUser));
    let body = request.body;
    console.log('objUser  : '+JSON.stringify(body));

    if(objUser.isManager)
    {
        
            let customApprovalUpdateQuery = 'UPDATE salesforce.Custom_Approval__c SET '+
                                            'status__c = \''+body.type+'\' '+
                                            'WHERE sfid = $1';
            
            console.log('customApprovalUpdateQuery  : '+customApprovalUpdateQuery);
            await
            pool.query(customApprovalUpdateQuery,[body.customApprovalId])
            .then((customApprovalResult) => {
                console.log('customApprovalResult  : '+JSON.stringify(customApprovalResult.rows));
            })
            .catch((customApprovalError) => {
                    console.log('customApprovalError  '+customApprovalError);
            })


            let expenseUpdateQuery = 'UPDATE salesforce.Milestone1_Expense__c SET '+ 
                                    'isHerokuEditButtonDisabled__c = false , '+
                                    'isHerokuApprovalButtonDisabled__c = false ,'+
                                    'isHerokuFeedbackButtonDisabled__c = true ,'+ 
                                    'approval_status__c = \''+body.type+'\' '+
                                    'WHERE sfid = $1';
            
            console.log('expenseUpdateQuery  : '+expenseUpdateQuery);

            await
            pool.query(expenseUpdateQuery,[body.expenseId])
            .then((expenseUpdateResult) => {
                console.log('expenseUpdateResult  : '+JSON.stringify(expenseUpdateResult.rows));
            
                    if(body.type == 'Approved')
                    {
                        response.send('Approved !');
                    }
                    else if(body.type == 'Rejected')
                    {
                        response.send('Rejected !');
                    }

            })
            .catch((expenseErrorResult) => {
                console.log('expenseErrorResult  '+expenseErrorResult);
            })

    }

});



module.exports = router;