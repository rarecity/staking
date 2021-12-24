const wax = new waxjs.WaxJS({
  rpcEndpoint: 'https://wax.greymass.com',
  tryAutoLogin: false
});
const transport = new AnchorLinkBrowserTransport();
const anchorLink = new AnchorLink({
  transport,
  chains: [{
    chainId: '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4',
    nodeUrl: 'https://wax.greymass.com',
  }],
});
const dapp = "RareCity";
const endpoint = "wax.pink.gg";
const tokenContract = {
  WAX: "eosio.token"
};

var t = 0;

var anchorAuth = "owner";
main();
var loggedIn = false;
var switchtostaked = true;
var collection = 'rarecitynfts';
var switchtoshop = false;
var canclick = false;
var mainDiv = document.getElementById("maindiv");
var loader = document.getElementById('loader').style;
var lvlloader = document.getElementById('lvlloader').style;
var overflow = document.getElementById('body').style;

async function main() {

  if (!loggedIn)
    autoLogin();
  else {

    clearUi();
    loader.display = "block";
    lvlloader.display = "none";

    ratespromise = GetRates();
    rates = await ratespromise;
    console.log("rate " + new Date().toUTCString());

    assetPromise = GetAssets(collection, rates);
    assets = await assetPromise;
    console.log("asset " + new Date().toUTCString());

    stakepromise = FilterStaked(assets);
    staked = await stakepromise;
    console.log("stk " + new Date().toUTCString());

    userpromise = GetUser(rates, staked);
    user = await userpromise;
    console.log("user " + new Date().toUTCString());

    balancepromise = GetBalance();
    balance = await balancepromise;
    console.log("balance " + new Date().toUTCString());

    pack = GetShop();
    pack_data = await pack;
    console.log("pack " + new Date().toUTCString());

    unstaked = FilterUnstaked(assets, staked);
    !switchtoshop?PopulateMenu(rates,staked, unstaked, user, balance):PopulateShop(pack_data);
    canclick = true;
    console.log("ui " + new Date().toUTCString());
  }
}

async function stakeall() {

  if (unstaked.length == 0) {
    ShowToast("No unstaked assets!");
    return;
  }
  if (loggedIn) {

    HideMessage();

    var ids = [];
    for (let i = 0; i < unstaked.length; i++) {
      ids.push(parseInt(unstaked[i].asset_id));
    }
    try {

      const result = await wallet_transact([{
        account: contract,
        name: "stakeassets",
        authorization: [{
          actor: wallet_userAccount,
          permission: anchorAuth
        }],
        data: {
          asset_ids: ids,
          _user: wallet_userAccount,
        },
      }, ]);
      switchtostaked = true;
      main();
      ShowToast("All Assets Staked Successfully !");
    } catch (e) {
      console.log(e);
      ShowToast(e.message);
    }

  } else {
    WalletListVisible(true);
  }
}

async function stakeasset(assetId) {

  if (loggedIn) {

    HideMessage();

    try {

      const result = await wallet_transact([{
        account: contract,
        name: "stakeassets",
        authorization: [{
          actor: wallet_userAccount,
          permission: anchorAuth
        }],
        data: {
          _user: wallet_userAccount,
          asset_ids: [assetId]
        },
      }, ]);
      main();
      ShowToast("All Assets Staked Successfully !");
    } catch (e) {
      ShowToast(e.message);
    }

  } else {
    WalletListVisible(true);
  }
}

async function buypack(template,price,qty){
  if (loggedIn) {

    HideMessage();

    try {
      totalPrice = (price * qty).toFixed(4);
      const result = await wallet_transact([{
        account: "rarecitytokn",
        name: "transfer",
        authorization: [{
          actor: wallet_userAccount,
          permission: anchorAuth
        }],
        data: {
          from: wallet_userAccount,
          to: marketContract,
          quantity: totalPrice.toString() + " "+ symbol, 
          memo: template + "%pack"
        },
      }, ]);
      ShowToast("Pack bought successfully - " + result.transaction_id);
      main();
    } catch (e) {
      ShowToast(e.message);
    }

  } else {
    WalletListVisible(true);
  }
}

function delay(delayInms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(2);
    }, delayInms);
  });
}

async function levelup(assetId,price) {

  if (loggedIn) {

    HideMessage();

    try {
      price = parseInt(price).toFixed(4);
      const result = await wallet_transact([{
        account: "rarecitytokn",
        name: "transfer",
        authorization: [{
          actor: wallet_userAccount,
          permission: anchorAuth
        }],
        data: {
          from: wallet_userAccount,
          to: marketContract,
          quantity: price.toString() + " " +  symbol, 
          memo: assetId + "%levelup"
        },
      }, ]);
      document.getElementById('maindiv').style.display = "none";
      document.getElementById('staking').style.display = "none";
      lvlloader.display = "block";
      await delay(3500);
      checklevelup(assetId,0);
    } catch (e) {
      ShowToast(e.message);
    }
  } else {
    WalletListVisible(true);
  }
}

async function checklevelup(assetid,count){
  var path = "/v1/chain/get_table_rows";
    var data = JSON.stringify({
      json: true,
      code: marketContract,
      scope: marketContract,
      table: "upgrades",
      lower_bound: assetid,
      upper_bound: assetid,
      limit: 1,
    });

    const response = await fetch("https://" + endpoint + path, {
      headers: {
        "Content-Type": "text/plain"
      },
      body: data,
      method: "POST",
    });

    const body = await response.json();
    count += 1;
    if(body.rows.length != 0){
      if(body.rows[0].user == wallet_userAccount && body.rows[0].asset_id == assetid){
        if(body.rows[0].success == "failed"){
          ShowToast("Level Up Failed :( Retry Again !");
          lvlloader.display = "none";
          document.getElementById('maindiv').style.display = "block";
          document.getElementById('staking').style.display = "block";
          return;
        }
        else if(body.rows[0].success == "checking"){
          ShowToast("Checking Again ! Taking Longer Time than Usual");
          if(count < 5){
            await delay(1050);
            checklevelup(assetid,count);
          }
          else if(count >= 5){
            ShowToast("Level Up Failed :( Retry Again !");
            main();
          }
        }
      }
    }
    else if(body.rows.length == 0 ){
      ShowToast("Leveled Up Successfully");
      main();
    }
    
}

async function assetunstake(assetId) {
  if (loggedIn) {

    HideMessage();

    try {

      var data1 = {
        asset_ids: [assetId]
      };
      const result = await wallet_transact([{
        account: contract,
        name: "removenft",
        authorization: [{
          actor: wallet_userAccount,
          permission: anchorAuth
        }],
        data: data1,
      }, ]);
      main();
      ShowToast("Asset Unstaked Successfully");
    } catch (e) {
      ShowToast(e.message);
    }

  } else {
    WalletListVisible(true);
  }
}

async function claimbalance() {
  if (loggedIn) {

    HideMessage();

    try {

      var data1 = {
        _user: wallet_userAccount,
      };
      const result = await wallet_transact([{
        account: contract,
        name: "claim",
        authorization: [{
          actor: wallet_userAccount,
          permission: anchorAuth
        }],
        data: data1,
      }, ]);
      ShowToast("Reward Claimed Successfully !");
      balancepromise = GetBalance();
      balance = await balancepromise;
      document.getElementById('balance').innerHTML = balance.toLocaleString('en-US') + " " + symbol;
    } catch (e) {
      ShowToast(e.message);
    }

  } else {
    WalletListVisible(true);
  }
}

function FilterUnstaked(assets, staked) {
  let results = [];
  for (let i = 0; i < assets.length; i++) {
    var check = false;
    for (let j = 0; j < staked.length; j++) {
      if (staked[j] == assets[i])
        check = true;
    }
    if (!check) {
      results.push(assets[i]);
    }
  }
  return results;
}

async function FilterStaked(assets) {

  let results = [];

  for (let i = 0; i < assets.length; i++) {
    var path = "/v1/chain/get_table_rows";
    var data = JSON.stringify({
      json: true,
      code: "rarecitydapp",
      scope: "rarecitydapp",
      table: "nfts",
      lower_bound: assets[i].asset_id,
      upper_bound: assets[i].asset_id,
      limit: 1,
    });

    const response = await fetch("https://" + endpoint + path, {
      headers: {
        "Content-Type": "text/plain"
      },
      body: data,
      method: "POST",
    });

    const body = await response.json();
    var data = body.rows[0];
    if(typeof data !== "undefined"){
      if(data.asset_id == assets[i].asset_id && data.account == wallet_userAccount)
      results.push(assets[i]);
    }
  }

  return results;
}

async function GetUser(rates) {

  var path = "/v1/chain/get_table_rows";

  var data = JSON.stringify({
    json: true,
    code: "rarecitydapp",
    scope: "rarecitydapp",
    table: "user",
    limit: 1,
    lower_bound: wallet_userAccount,
  });

  const response = await fetch("https://" + endpoint + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    body: data,
    method: "POST",
  });

  const body = await response.json();

  var user = {
    stakePower: 0,
    next_claim: "-",
    unclaimed_amount: 0,
  };
  if (body.rows.length != 0) {
    for (let j = 0; j < body.rows[0].data.length; j++) {
    var datex=Date(body.rows[0].data[j].last_claim);
    var now= new Date();
    var date=Math.floor(now/1000);    
    const utcMilllisecondsSinceEpoch = now.getTime() 
    const utcSecondsSinceEpoch = Math.round(utcMilllisecondsSinceEpoch / 1000) 
    
    var ts = -utcSecondsSinceEpoch+ 3600+ body.rows[0].data[j].last_claim;
    user.next_claim=ts;
    }
    if(t!=0)
    restartTimer();

   startTimer(ts);

  }


  return user;


}

function startTimer(duration) {
  var timer = duration, minutes, seconds;
  if(t!=0) restartTimer(t);
  t=setInterval(function () {
      hours=  parseInt(timer / 3600, 10)
      minutes = parseInt((timer-hours*3600) / 60,10);
      seconds = parseInt(timer % 60, 10);

      hours = hours < 10 ? "0" + hours : hours;

      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds; 
      display= minutes+":"+seconds;
      document.getElementById("timetor").innerHTML=display;
      if (--timer < 0) {
          timer =0;
      }
  },1000);
}

function restartTimer(t)
{
clearInterval(t);
}

async function GetAssets(colc,rates) {
  let results = [];
  var path = "atomicassets/v1/assets?collection_name=" + colc + "&owner=" + wallet_userAccount + "&page=1&limit=1000&order=desc&sort=asset_id";
  const response = await fetch("https://" + "wax.api.atomicassets.io/" + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    method: "POST",
  });

  const body = await response.json();
  tableRows = GetStakingTableRows();
  level = await tableRows;

  if(level != 0){
    for(i = 0; i < body.data.length; i++){
      var data = body.data[i];
      if(typeof data.mutable_data.Level !== "undefined")
      lvl = data.mutable_data.Level;
      else
      lvl = 1;
      for(n = 0; n < level.length; n++){
        if(data.template.template_id == level[n].id){
          var rate = 0;
          rate_ = 0;
          for (let j = 0; j < rates.length; j++) {
            if (data.collection.collection_name == rates[j].pool) {
              for (let k = 0; k < rates[j].levels.length; k++) {
                if (rates[j].levels[k].key == level[n].level) {
                  rate = parseFloat(rates[j].levels[k].value);
                  rate_ = lvl > 1 ? parseFloat(lvl)* parseFloat(rate) : rate;
                }
              }
            }
          }
          results.push({
            asset_id: data.asset_id,
            img: data.data.img,
            name: data.name,
            level_: lvl,
            price: rate_.toFixed(4) * 1000,
            rateperday: rate_.toFixed(4)*1,
          });
        }
      }
    }
  }
  return results;
}

async function GetRates() {
  var path = "/v1/chain/get_table_rows";

  var data = JSON.stringify({
    json: true,
    code: "rarecitydapp",
    scope: "rarecitydapp",
    table: "collections",
    limit: 1000,
  });

  const response = await fetch("https://" + endpoint + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    body: data,
    method: "POST",
  });

  var rates = [];
  const body = await response.json();

  if (body.rows.length != 0) {
    for (let i = 0; i < body.rows.length; i++) {
      rates.push({
        pool: body.rows[i].pool,
        bonuses: body.rows[i].bonuses,
        levels: body.rows[i].levels,
      })
    }
  }
  return rates;
}

async function GetStakingTableRows() {

  var path = "/v1/chain/get_table_rows";

  var data = JSON.stringify({
    json: true,
    code: "rarecitydapp",
    scope: "rarecitydapp",
    table: "leveltemp",
    limit: 1000,
  });

  const response = await fetch("https://" + endpoint + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    body: data,
    method: "POST",
  });

  const body = await response.json();
  var ids = [];
  if (body.rows.length != 0) {
    for (let i = 0; i < body.rows.length; i++) {
      for (let j = 0; j < body.rows[i].template_ids.length; j++) {
        ids.push({
          id:body.rows[i].template_ids[j],
          level:body.rows[i].level
        });
      }
    }
    return ids;
  }
  return 0;
}

async function GetBalance() {

  var path = "/v1/chain/get_table_rows";

  var data = JSON.stringify({
    json: true,
    code: "rarecitytokn",
    scope: wallet_userAccount,
    table: "accounts",
    limit: 1000,
  });

  const response = await fetch("https://" + endpoint + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    body: data,
    method: "POST",
  });

  const body = await response.json();

    balance=parseFloat(0.0000);
  if (body.rows.length != 0) {
    for (j = 0; j < body.rows.length; j++) {
      if (body.rows[j].balance.includes(symbol))
        balance = parseFloat(body.rows[j].balance).toFixed(4);
    }
  }

  return balance;

}

async function GetShop() {

  var path = "/v1/chain/get_table_rows";
  var data = JSON.stringify({
    json: true,
    code: "rarecitymrkt",
    scope: "rarecitymrkt",
    table: "listings",
    limit: 1000,
  });

  const response = await fetch("https://" + endpoint + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    body: data,
    method: "POST",
  });

  const body = await response.json();
  var packs = [];
  var data = [];

  if (body.rows.length != 0) {
    for (j = 0; j < body.rows.length; j++) {
      r = GetTemplateData(body.rows[j].collection_name,body.rows[j].template_id);
      result = await r;
      cost = body.rows[j].price.split(" ");
      packs.push({
        name: result[0].name,
        img: result[0].img,
        price: cost[0],
        template:body.rows[j].template_id,
        id:body.rows[j].id,
        total:body.rows[j].total,
        available:body.rows[j].available
      });
    }
  }

  return packs;

}

async function GetTemplateData(colc, id){
  var path = "atomicassets/v1/templates/" + colc + "/" + id;
  const response = await fetch("https://wax.api.atomicassets.io/" + path, {
    headers: {
      "Content-Type": "text/plain"
    },
    method: "POST",
  });

  const body = await response.json();
  result = [];
  result.push({
    name: body.data.name,
    img: body.data.immutable_data.img
  });
  return result;
}

function PopulateShop(pack_data){
  let src = "https://ipfs.wecan.dev/ipfs/";

  for(var index = 0; index < pack_data.length; ++index){

    var items = document.createElement('div');
    items.className = "itemwrapper";

    var div = document.createElement('div');
    div.id = 'tablecontainer';
    div.className = 'tablecontainer';

    img2 = document.createElement('img');
    img2.src = src + pack_data[index].img;
    img2.className = 'packimg';
    items.appendChild(img2);

    var div3 = document.createElement('div');
    div3.id = 'textstyle';
    div3.textContent = pack_data[index].name;
    div3.className = 'textstyle';
    items.appendChild(div3);

    var quantity = document.createElement('p');
    quantity.textContent = pack_data[index]

    var div4 = document.createElement('div');
    div4.className = 'ratediv';
    var rate = document.createElement('p');
    rate.className = 'ratesText';
    rate.textContent = pack_data[index].price;
    var sym = document.createElement('p');
    sym.textContent = symbol;

    var div5 = document.createElement('div');
    div5.className = 'ratediv';
    var qty = document.createElement('p');
    qty.className = 'ratesText';
    qty.textContent = "Available : " + pack_data[index].available;
    var max = document.createElement('p');
    max.textContent = " / " + pack_data[index].total;

    var buyqty = document.createElement('input');
    buyqty.className = "inc";
    buyqty.type = "number";
    buyqty.min = "1";
    buyqty.max = "5";
    buyqty.value = "1";

    let btn = document.createElement('BUTTON');
    btn.id = pack_data[index].id;
    btn.className = "stkbtn";
    btn.textContent = "BUY";
    btn.onclick = async function buy(){
      buypack(btn.id,rate.textContent,buyqty.value);
    }

    div4.appendChild(rate);div4.appendChild(sym);
    div5.appendChild(qty);div5.appendChild(max);
    items.appendChild(div4);
    items.appendChild(buyqty);
    items.appendChild(div5);
    items.appendChild(btn);
    div.appendChild(items);
    mainDiv.appendChild(div);
  }
  loader.display = "none";
  mainDiv.style.display = "block";

}


function PopulateMenu(rates,staked, unstakeasset, user, balance) {
  let src = "https://ipfs.wecan.dev/ipfs/";
  var unstaked = switchtostaked ? staked : unstakeasset;
  var pools = "";
  var ids = [];
  var stakepower=0.00;
  for (let i = 0; i < unstaked.length; i++) {
    ids.push(parseInt(unstaked[i].asset_id));
  }
  document.getElementById('balance').innerHTML = balance.toLocaleString('en-US') + " " + symbol;
  colls = document.getElementById('sidebar-content');
  for(var index = 0; index < rates.length; index++){
    pools += '<div><button class = "collectonsbtn" id='+rates[index].pool+' onclick="switchtodiffcoll('+rates[index].pool+')">';
    pools += '<div><img class = "token" src ="./assets/Token.png"></div>';
    pools += '<p class = "pool">' + rates[index].pool + '</p></div>';
  }
  colls.innerHTML = pools;
  overflow.overflowY = "visible";

  if(unstaked.length < 1){
    loader.display = "none";
    document.getElementById('staking').style.display = "block";
    ShowToast("No Assets To Display !");
    return;
  }
  else
  {
    unstaked.forEach(element => {
      stakepower+=element.rateperday;
    });
  document.getElementById('stkpowerid').innerHTML=stakepower.toFixed(4)+" RARC/Hour"
  }
  console.log(stakepower);
  
  for (var index = 0; index < unstaked.length; ++index) {
  
    var items = document.createElement('div');
    items.className = "itemwrapper";
    items.id = index;

    var div = document.createElement('div');
    div.id = 'tablecontainer';
    div.className = 'tablecontainer';

    var container = document.createElement('div');
    container.className = "textcontainer";

    var topbar = document.createElement('div');
    topbar.className = "topbar";

    var level = document.createElement('p');
    level.className = "level";
    level.textContent = "LEVEL : " + unstaked[index].level_;
    var leveln = document.createElement('p');
    leveln.className = "n";
    leveln.id = unstaked[index].price;
    leveln.textContent = unstaked[index].level_ != 10?unstaked[index].price.toLocaleString('en-US'):"Max Level";
    topbar.appendChild(level);
    switchtostaked?topbar.appendChild(leveln):"";
    collection == "rarecitynfts"?items.appendChild(topbar):"";

    img2 = document.createElement('img');
    img2.src = src + unstaked[index].img;
    img2.className = 'nftimg';
    items.appendChild(img2);

    var div2 = document.createElement('p');
    div2.textContent = unstaked[index].asset_id;
    div2.className = 'textstyle';
    div2.style = 'font-size:15px';
    container.appendChild(div2);

    var div3 = document.createElement('div');
    div3.id = 'textstyle';
    div3.textContent = unstaked[index].name;
    div3.className = 'textstyle';
    container.appendChild(div3);

    var div4 = document.createElement('div');
    div4.className = 'ratediv';
    var rate = document.createElement('p');
    rate.className = 'ratesText';
    rate.textContent = unstaked[index].rateperday ;
    var sym = document.createElement('p');
    sym.textContent = symbol+"/H";
    div4.appendChild(rate);div4.appendChild(sym);
    container.appendChild(div4);
    items.appendChild(container);

    var bar = document.createElement('div');
    bar.className = "bar";

    let stkbtn = document.createElement('BUTTON');
    stkbtn.id = unstaked[index].asset_id;
    stkbtn.textContent = !switchtostaked?'Stake':'Unstake';
    stkbtn.className = "stkbtn";
    stkbtn.onclick = async function s(){
    !switchtostaked?stakeasset(stkbtn.id):assetunstake(stkbtn.id);};
    let levelbtn = document.createElement('BUTTON');
    levelbtn.textContent = 'Level UP';
    levelbtn.id = unstaked[index].price;
    levelbtn.className = "levelbtn";
    levelbtn.onclick = async function level(){
      levelup(stkbtn.id,levelbtn.id);
    };
    bar.appendChild(stkbtn);
    if(switchtostaked && collection == "rarecitynfts" && unstaked[index].level_ != "10")bar.appendChild(levelbtn);
    items.appendChild(bar);
    div.appendChild(items);
    mainDiv.appendChild(div);
    }

    loader.display = "none";
    document.getElementById('staking').style.display = "block";
    mainDiv.style.display = "block";
}


function switchstaked(index) {
  switchtostaked = index;
  clearUi();
  PopulateMenu(rates, staked, unstaked, user, balance);
}

function switchshop(index) {
  if(canclick){
    switchtoshop = index;
    var ele = !switchtoshop?'shop':'stakingbar';
    var ele2 = switchtoshop?'shop':'stakingbar'
    document.getElementById(ele2).style.display = "none";
    document.getElementById(ele).style.display = "block";
    clearUi();
    !switchtoshop?PopulateMenu(rates, staked, unstaked, user, balance):PopulateShop(pack_data);
    overflow.overflowY = "visible";
  }
}

function switchtodiffcoll(index){
  if(collection != index.id){
    collection = index.id;
    switchtoshop?switchshop(false):'';
    main();
  }
}

function clearUi(){
  document.getElementById('staking').style.display = "none";
  mainDiv.style.display = "none";
  overflow.overflowY = "hidden";
  if(mainDiv.children.length >=1){
    var child = mainDiv.lastElementChild;
    while (child) {
      mainDiv.removeChild(child);
      child = mainDiv.lastElementChild;
    }
  }
}

function CustomInputChanged() {
  var element = document.getElementById("custominput");
  element.value = parseInt(element.value);
  var valid = element.value > 0;
  var timeMultiplier = GetTimeMultiplier();
  document.getElementById("customamount").innerHTML =
    (timeMultiplier * element.value) / config.Multiplier;
  document.getElementById("buy" + menuPrices.length).disabled = !valid;
}

function TimeInputChanged() {
  var textValue = document.getElementById("timeinput").value;
  if (textValue.length > 0) {
    var value = parseInt(textValue);
    if (value < 1) {
      value = 1;
    }
    document.getElementById("timeinput").value = value;
    document.getElementById("timeunit").innerHTML = value > 1 ? "days" : "day";
  }
  var oldCustom = document.getElementById("custominput").value;
  PopulateMenu();
  document.getElementById("custominput").value = oldCustom;
  CustomInputChanged();
}

function GetTimeMultiplier() {
  var textValue = document.getElementById("timeinput").value;
  if (textValue.length > 0) {
    var timeMultiplier = parseInt(textValue);
    if (timeMultiplier < 1) {
      timeMultiplier = 1;
    }
    return timeMultiplier;
  } else {
    return 1;
  }
}

function WalletListVisible(visible) {
  document.getElementById("walletlist").style.visibility = visible ?
    "visible" :
    "hidden";
}

function ShowMessage(message) {
  document.getElementById("messagecontent").innerHTML = message;
  document.getElementById("message").style.visibility = "visible";
}

function HideMessage(message) {
  document.getElementById("message").style.visibility = "hidden";
}



function CalcDecimals(quantity) {
  var dotPos = quantity.indexOf(".");
  var spacePos = quantity.indexOf(" ");
  if (dotPos != -1 && spacePos != -1) {
    return spacePos - dotPos - 1;
  }
  return 0;
}

async function GetFreeSpace() {
  for (var index = 0; index < pools.length; index++) {
    var path = "/v1/chain/get_table_rows";
    var data = JSON.stringify({
      json: true,
      code: "eosio.token",
      scope: pools[index].contract,
      table: "accounts",
      lower_bound: "WAX",
      upper_bound: "WAX",
      limit: 1,
    });
    const response = await fetch("https://" + endpoint + path, {
      headers: {
        "Content-Type": "text/plain"
      },
      body: data,
      method: "POST",
    });
    const body = await response.json();
    if (body.rows && Array.isArray(body.rows) && body.rows.length == 1) {
      pools[index].freeSpace = Math.floor(parseFloat(body.rows[0].balance));
      if (pools[index].contract == contract) {
        document.getElementById("freevalue").innerHTML =
          pools[index].name +
          ": " +
          pools[index].freeSpace +
          " WAX" +
          " available";
      }
    } else {
      ShowToast("Unexpected response retrieving balance");
    }
  }
}

function GetSymbol(quantity) {
  var spacePos = quantity.indexOf(" ");
  if (spacePos != -1) {
    return quantity.substr(spacePos + 1)
  }
  return ""
}

async function ShowToast(message) {
  var element = document.getElementById("toast");
  element.innerHTML = message;
  toastU = 0;
  var slideFrac = 0.05;
  var width = element.offsetWidth;
  var right = 16;
  var id = setInterval(frame, 1e3 / 60);
  element.style.right = -width + "px";
  element.style.visibility = "visible";

  function frame() {
    toastU += 0.005;
    if (toastU > 1) {
      clearInterval(id);
      element.style.visibility = "hidden";
    }
    p =
      toastU < slideFrac ?
      toastU / slideFrac / 2 :
      1 - toastU < slideFrac ?
      (1 - toastU) / slideFrac / 2 :
      0.5;
    element.style.right =
      (width + right) * Math.sin(p * Math.PI) - width + "px";
  }
}
async function autoLogin() {
  var isAutoLoginAvailable = await wallet_isAutoLoginAvailable();
  if (isAutoLoginAvailable) {
    login();
  }
}
async function selectWallet(walletType) {
  wallet_selectWallet(walletType);
  login();
}
async function logout() {
  wallet_logout();
  clearUi();
  document.getElementById("loggedin").style.display = "none";
  document.getElementById("loggedout").style.display = "block";
  document.getElementById('staking').style.display = "none";
  document.getElementById('shop').style.display = "none";
  document.getElementById('blc').style.display = "none";
  document.getElementById('claim').style.display = "none";
  document.getElementById('sideContent').style.display = "none"; 
  loggedIn = false;
  HideMessage();
}
async function login() {
  try {
    if (!loggedIn) {
      const userAccount = await wallet_login();
      ShowToast("Logged in as: " + userAccount);
      document.getElementById("loggedout").style.display = "none";
      document.getElementById("loggedin").style.display = "block";
      document.getElementById('sideContent').style.display = "block";
      document.getElementById('shop').style.display = "block"
      document.getElementById('blc').style.display = "block";
      document.getElementById('claim').style.display = "block";
      WalletListVisible(false);
      loggedIn = true;
      main();
    }
  } catch (e) {
    ShowToast(e.message);

  }
}
async function wallet_isAutoLoginAvailable() {
  var sessionList = await anchorLink.listSessions(dapp);
  if (sessionList && sessionList.length > 0) {
    useAnchor = true;
    return true;
  } else {
    useAnchor = false;
    return await wax.isAutoLoginAvailable();
  }
}


async function wallet_selectWallet(walletType) {
  useAnchor = walletType == "anchor";
}
async function wallet_login() {
  if (useAnchor) {
    var sessionList = await anchorLink.listSessions(dapp);
    if (sessionList && sessionList.length > 0) {
      wallet_session = await anchorLink.restoreSession(dapp);
    } else {
      wallet_session = (await anchorLink.login(dapp)).session;
    }
    wallet_userAccount = String(wallet_session.auth).split("@")[0];
    auth = String(wallet_session.auth).split("@")[1];
    anchorAuth = auth;

  } else {
    wallet_userAccount = await wax.login();
    wallet_session = wax.api;
    anchorAuth = "active";
  }
  return wallet_userAccount;
}
async function wallet_logout() {
  if (useAnchor) {
    await anchorLink.clearSessions(dapp);
  }
}
async function wallet_transact(actions) {
  if (useAnchor) {
    var result = await wallet_session.transact({
      actions: actions
    }, {
      blocksBehind: 3,
      expireSeconds: 30
    });
    result = {
      transaction_id: result.processed.id
    };
  } else {
    var result = await wallet_session.transact({
      actions: actions
    }, {
      blocksBehind: 3,
      expireSeconds: 30
    });
  }
  return result;
}