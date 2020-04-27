/*
 * @Author: hucheng
 * @Date: 2020-04-25 17:38:34
 * @Description: here is des
 */
const express = require('express');
const url = require('url');
const router = express.Router();
const sourceMap = require("source-map")
const path = require("path");
const fs = require("fs");
const publicDir = path.resolve(__dirname, "..", "public");
let sourcesPathMap = {};
const map = new Map();
router.post('/reportErrorMessage', function(req, res, next) {
    const {msg,stack} = req.body;
    if(!map.has(msg)){
        map.set(msg,req.body);
}
    res.send('respond with a resource');
});
router.get('/listErrorMessage', function(req, res, next) {
    res.send([...map.values()]);
});
router.get('/detailError', async function(req, res, next) {
    const {msg} = req.query; 
    const errInfo = map.get(msg);
    const sourceMapArray = errInfo.stack.exception.values[0].stacktrace.frames;
    const getSourceMapFn = (element) => {
        let filePath = url.parse(element.filename).pathname;
        const fileName = path.basename(filePath);
        const mapPath = path.resolve(path.join(__dirname,'..','public',fileName+'.map'))
        return lookupSourceMap(mapPath,element.lineno,element.colno);
    }
    let promiseArray = [];
    sourceMapArray.forEach((element, i) => {
        if(isDef(element.lineno) && isDef(element.colno)){
            promiseArray.push((getSourceMapFn)(element));
        }
    });
    const data = await Promise.all(promiseArray)
    
    res.send(data);

});
// 查找sourcemap
function isDef(value) {
    return value !== undefined && value !== null && value !== '';
  }
function fixPath(filepath) {
    return filepath.replace(/\.[\.\/]+/g, "");
}
async function lookupSourceMap(mapFile, line, column){
    const {fileObj, sourcesPathMap} = await getSourceData(mapFile);
    return new sourceMap.SourceMapConsumer(fileObj).then(consumer => {
        return getData(consumer, fileObj, sourcesPathMap);
    });
    function getData(consumer, fileObj, sourcesPathMap) {
        let lookup = {
            line: parseInt(line),
            column: parseInt(column)
        };
        let result = consumer.originalPositionFor(lookup);
        let originSource = sourcesPathMap[result.source],
            sourcesContent =
                fileObj.sourcesContent[
                    fileObj.sources.indexOf(originSource)
                ];

        result.sourcesContent = sourcesContent;

        return Promise.resolve(result);
    }
}
function getSourceData(mapFile) {
    let res = fs.readFileSync(path.resolve(mapFile)).toString()
    res = JSON.parse(res)
    let { fileObj, sourcesPathMap } =  operateData(res);
    return Promise.resolve({fileObj,sourcesPathMap})

    function operateData(fileObj) {
        let sources = fileObj.sources || [];
        let sourcesPathMap = {};
        sources.map(item => {
            if( item.indexOf(".vue") !== -1 ){
                sourcesPathMap[item] = item;
            }else{
                sourcesPathMap[fixPath(item)] = item;
            }
        });
        return { fileObj, sourcesPathMap };
    }
}
module.exports = router;