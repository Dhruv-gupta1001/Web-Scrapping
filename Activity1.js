// node Activity1.js --excel=WorldCup.csv --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results 


let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom"); //yad nhi araha
let fs= require("fs");
let excel = require("excel4node");
let pdf=require("pdf-lib");
let path= require("path");


let args= minimist(process.argv);
let prmdwnld = axios.get(args.source);
prmdwnld.then(function(response){
    let html = response.data;

    let dom= new jsdom.JSDOM(html);
    let document=dom.window.document;

    let matches=[];
    let matchScorediv = document.querySelectorAll("div.match-score-block");
    for(let i=0;i<matchScorediv.length;i++){
        // let match={};
        //or
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        };
        let teams = matchScorediv[i].querySelectorAll("p.name");
        match.t1= teams[0].textContent;
        match.t2= teams[1].textContent;

        let scoreSpans = matchScorediv[i].querySelectorAll("span.score");
        if(scoreSpans.length==2){
            match.t1s= scoreSpans[0].textContent;
            match.t2s= scoreSpans[1].textContent; 
        }
        else if(scoreSpans.length==1){
            match.t1s= scoreSpans[0].textContent;
            match.t2s= "";
        }
        else{
            match.t1s= "";
            match.t2s= "";
        }

        let spanResult = matchScorediv[i].querySelector("div.status-text > span");
        match.result = spanResult.textContent;
        // console.log(match.result);

        matches.push(match);
    }
    // console.log(matches);
    let matchesJSON = JSON.stringify(matches);          
    fs.writeFileSync("matches.json",matchesJSON,"utf-8");   //Alt+Shift+F

    let teams=[];
    for(let i=0;i<matches.length;i++){
        putTeamInTeamsArrayIfMissing(teams,matches[i]);
    }

    

    for(let i = 0;i<matches.length;i++){
        putMatchInAppropriateTeam(teams,matches[i]);
    }

    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json",teamsJSON,"utf-8");

    createExcelFile(teams);
    fs.mkdirSync("WorldCup");
    createFolders(teams);

    // let trial = path.join("WorldCup","Australia");
    // let trial2=path.join(trial,"England.pdf");
    // let content = fs.readFileSync("Template.pdf","utf-8");
    // fs.mkdirSync(trial2,content);
})

function putTeamInTeamsArrayIfMissing(teams,match){
    let t1idx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==match.t1){
            t1idx=i;
            break;
        }
    }
    if(t1idx==-1){
        teams.push({
            name:match.t1,
            matches:[]
        });
    }

    let t2idx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==match.t2){
            t2idx=i;
            break;
        }
    }
    if(t2idx==-1){
        teams.push({
            name:match.t2,
            matches:[]
        });
    }
}

function putMatchInAppropriateTeam(teams,match){
    let t1idx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==match.t1){
            t1idx=i;
            break;
        }
    }
    let t1= teams[t1idx];

    t1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result:match.result
    })

    let t2idx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==match.t2){
            t2idx=i;
            break;
        }
    }
    let t2= teams[t2idx];

    t2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result:match.result
    })

}

function createExcelFile(teams){
    let wb= new excel.Workbook();

    for(let i=0;i<teams.length;i++){
        let team= teams[i];
        let ws =wb.addWorksheet(team.name);
        
        ws.cell(1,1).string("VS");
        ws.cell(1,2).string("SelfScore");
        ws.cell(1,3).string("OppScore");
        ws.cell(1,4).string("Result");
       
        for(let j=0;j<teams[i].matches.length;j++){
            ws.cell(j+2,1).string(team.matches[j].vs);
            ws.cell(j+2,2).string(team.matches[j].selfScore);
            ws.cell(j+2,3).string(team.matches[j].oppScore);
            ws.cell(j+2,4).string(team.matches[j].result);
        }
    }
    wb.write("WorldCup.csv");

}

function createFolders(teams){
    
    for(let i=0;i<teams.length;i++){
        let team= teams[i];
        let folderName = path.join("WorldCup",team.name);
        fs.mkdirSync(folderName);
        createScoreCard(team,folderName);
    }
}

function createScoreCard(team,folderName){
    for(let i=0;i<team.matches.length;i++){
        let t1=team.name;
        let t2=team.matches[i].vs;
        let t1s=team.matches[i].selfScore;
        let t2s=team.matches[i].oppScore;
        let result=team.matches[i].result;
        let fileName = path.join(folderName,t2+".pdf");
        let filePath = path.join(folderName,t2);
        // let checkFile = "./WorldCup/"+t1+"/"+t2+".pdf"
        // if(fs.existsSync(fileName)==true){
        //     console.log("dfsfdsfs")
        //     fileName= path.join(folderName,t2+"1"+".pdf");
        // }
        // console.log(fileName)

        // if(fs.existsSync(fileName) == true){   //synchronous method not working
        //     console.log("asdasda")
        // }
        
        let originalBytes= fs.readFileSync("Template.pdf");

        let pdfdocKaPromise=pdf.PDFDocument.load(originalBytes);
        pdfdocKaPromise.then(function(pdfDoc){
            let page=pdfDoc.getPage(0);
            page.drawText(t1, {
                x: 320,
                y: 729,
                size: 8
            });
            page.drawText(t2, {
                x: 320,
                y: 715,
                size: 8
            });
            page.drawText(t1s, {
                x: 320,
                y: 701,
                size: 8
            });
            page.drawText(t2s, {
                x: 320,
                y: 687,
                size: 8
            });
            page.drawText(result, {
                x: 320,
                y: 673,
                size: 8
            });

            let finalPDFBytesKaPromise=pdfDoc.save();
            finalPDFBytesKaPromise.then(function(finalPDFBytes){
                // fs.writeFileSync(fileName,finalPDFBytes,"utf-8");
                if(fs.existsSync(filePath+".pdf") == true){
                    // console.log("Sdfsdfsdfs")
                    fs.writeFileSync(filePath+"1.pdf",finalPDFBytes)
                } 
                else {
                    fs.writeFileSync(fileName , finalPDFBytes);
                }
            });
        })
    }
}