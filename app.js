let express = require('express')
let app = express()
app.use(express.json())
let path = require('path')
let sqlite3 = require('sqlite3')
let {open} = require('sqlite')

let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken')

let db_path = path.join(__dirname, 'covid19IndiaPortal.db')
let dataBase = null
let initaize_db_server = async () => {
  try {
    dataBase = await open({
      filename: db_path,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running on port 3000')
    })
  } catch (error) {
    console.log(error.meassage)
    process.exit(1)
  }
}
initaize_db_server()

app.post('/user/', async (request, response) => {
  let {username, password, name, gender, location} = request.body

  let query = `
  select 
  *
  from 
  user
  where 
  username='${username}';
  `
  let db_response = await dataBase.get(query)
  if (db_response === undefined) {
    console.log('hi')
  } else {
    console.log('alre')
  }
})

app.post('/login/', async (request, response) => {
  let {username, password} = request.body
  let query = `
    
    select 
    *
    from
    user
    where 
    username='${username}'

   `

  let db_response = await dataBase.get(query)
  if (db_response === undefined) {
    response.status('400')
    response.send('Invalid user')
  } else {
    let decrypt = await bcrypt.compare(password, db_response.password)
    if (decrypt === true) {
      let payload = {username: `${username}`}
      let access_token = jwt.sign(payload, 'venky')
      response.status('200')
      response.send(access_token)
    } else {
      response.status('400')
      response.send('Invalid password')
    }
  }
})

let middlle_ware_func = (request, response, next) => {
  let access_token = request.headers['authorization']
  let conform_token
  if (access_token !== undefined) {
    conform_token = access_token.split(' ')[1]
    //console.log(conform_token)
  }
  if (conform_token === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    let verify = jwt.verify(conform_token, 'venky', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid User')
      } else {
        next()
      }
    })
  }
}

app.get('/states/', middlle_ware_func, async (request, response) => {
  let query = `
    select 
    *
    from 
    state
    `
  let db_response = await dataBase.all(query)
  response.send(
    db_response.map(each => ({
      stateId: each.state_id,
      stateName: each.state_name,
      population: each.population,
    })),
  )
})

let get_unique_state = each => {
  return {
    stateId: each.state_id,
    stateName: each.state_name,
    population: each.population,
  }
}

app.get('/states/:stateId/', middlle_ware_func, async (request, response) => {
  let {stateId} = request.params

  let query = `
    select 
    *
    from 
    state
    where
    state_id=${stateId}
    `

  let db_response = await dataBase.get(query)
  response.send(get_unique_state(db_response))
})

app.post('/districts/', async (request, response) => {
  let {districtName, stateId, cases, cured, active, deaths} = request.body
  let query = `
    insert into district(district_name,state_id,cases,cured,active,deaths)
    values("${districtName}",${stateId},${cases},${cured},${active},${deaths});
    `
  await dataBase.run(query)
  response.send('District Successfully Add')
})

/*{
  "districtName": "Bagalkot",
  "stateId": 3,
  "cases": 2323,
  "cured": 2000,
  "active": 315,
  "deaths": 8
}*/
let unique_district = each => {
  return {
    districtName: each.district_id,
    stateId: each.state_id,
    cases: each.cases,
    cured: each.cured,
    active: each.active,
    deaths: each.deaths,
  }
}

app.get('/districts/:districtId/', async (request, response) => {
  let {districtId} = request.params
  let query = `
  select 
  *
  from 
  district
  where
  district_id=${districtId};

  `
  db_response = await dataBase.get(query)
  response.send(unique_district(db_response))
})

app.delete('/districts/:districtId/', async (request, response) => {
  let {districtId} = request.params
  let query = `
  delete 
  from
  district
  where
  district_id=${districtId}
  `
  await dataBase.run(query)
  response.send('District Removed')
})

/*{
  "districtName": "Bagalkot",
  "stateId": 3,
  "cases": 2323,
  "cured": 2000,
  "active": 315,
  "deaths": 8
}*/
app.put('/districts/:districtId', async (request, response) => {
  let {districtName, stateId, cases, cured, active, deaths} = request.body
  let {districtId} = request.params

  let query = `

   update district
   set
   district_name="${districtName}",
   state_id=${stateId},
   cases=${cases},
   cured=${cured},
   active=${active},
   deaths=${deaths}
   `
  await dataBase.run(query)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  let {stateId} = request.params
  let query = `
  select 
  sum(cases) as totalCases,
  sum(cured) as totalCured,
  sum(active) as totalActive,
  sum(deaths) as totalDeaths
  from 
  district
  where
  state_id =${stateId}
  `
  let db_response = await dataBase.get(query)
  response.send(db_response)
})

module.exports = app
