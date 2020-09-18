import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Context } from './store.jsx';
import Graph from "react-graph-vis";
import { useIndexedDB } from 'react-indexed-db';

function GraphViz(props) {
  const { store, dispatch } = useContext(Context);
  const [net, setNet] = useState({})
  const [savedSchema, saveSchema] = useState();
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])

  const [mutationRef, setmutationRef] = useState({});
  const [updatedSchema, updateSchema] = useState(0);
  const [greenNode, greenNodeOn] = useState(false);
  const [events, setEvents] = useState({});
  const [convert, setConvert] = useState({});
  const [graphObjRef, setgraphObjRef] = useState({});
  const [initialRender, setInitialRender] = useState(true);
  
  const schemaDB = useIndexedDB('schemaData');
  const [graph, setGraph] = useState(
    {
      nodes: [], 
      edges: []
    },
  );
  const [graphGreen, setGraphGreen] = useState(
    {
      nodes: [], 
      edges: []
    },
  );
  const [options, setOptions] = useState(
    {
      layout: {
        improvedLayout: true
      },
      physics:{
        enabled: true,
      },
      nodes: {
        shape: 'circle',
      },
      interaction: {
        hover: true,
        zoomView: true,
      },
      manipulation: {
        enabled: false,
      },
      clickToUse: false,
      edges: {
        color: '#c8c8c8',
        smooth: {
          enabled: true,
          type: "dynamic",
        },
      },
      height: props.height,
      width: props.width,

      autoResize: true,
    },
   )
 
    useEffect(()=>{
      if (!props.fullGraph) {
      console.log('schema USE EFFECT')

   

      // Triggered when there is a new schema in the database (the useEffect listens for 'updatedSchema')
      // Creates and formats a field for each new line in the schema. Differentiates 'Query' and 'Mutation'
      let allMutations;
      if (store.schema.schemaNew){
        const arrTypes = store.schema.schemaNew.split(/}/);
        const formatted = arrTypes.map((type)=>{
          if (type.includes('Mutation')) {
            allMutations = type;
          }
            const split = type.split(/\n/);
            return split.map((field)=>{
            const trimmed = field.trim();
            return trimmed;
          })
          
        
        })
        // Separating query and mutation types from general type fields, 
        // which will be used to create nodes in graph.
        let queryArr;
        let queryIndex;
        let mutationIndex;
        formatted.forEach((el, i)=>{
          const elJoin = el.join("");
          if(elJoin.includes("Query")) {
            queryArr = el;
            queryIndex = i;
          }
          if(elJoin.includes("Mutation")) {
            mutationIndex = i;
          }
        })
        
        const queryConvert = {};
        const mutationConvert = {};
        // Fill out 'queryConvert' to be a dictonary that looks up the field 'type' for a query 'type' (key/value pair -> people: 'Person')
        queryArr.forEach((el)=>{
          if (el.includes(":")) {
            const elSplit = el.split(':');
            const lastElSplit = elSplit[elSplit.length-1];
            const regex = /[A-Za-z]+/;
            const found = lastElSplit.match(regex);
            const left = elSplit[0];
            const leftName = left.split("(");
            queryConvert[leftName[0]] = found[0];
          }
        })
        // Fill out 'mutationConvert' to be a dictonary that looks up the field 'type' for a mutation 'type' (key/value pair -> createPerson: 'Person')
        const mutationSplitBracket = allMutations.split(/{\n/)
        const regex = /!\n/
        const mutation = mutationSplitBracket[1].split(regex);
        console.log(mutation)
        mutation.map((el) => {
          const regexEnd = /\):/
          let endNode = el.split(regexEnd);
          let field = endNode[endNode.length-1].trim()
          const index = el.indexOf("(");
          const sliced = el.slice(0, index).trim()
          if (sliced.length !== 0){
            mutationConvert[sliced] = field;
          }
        })
        // "setmutationRef" and "setConvert" save their respective object arguments in state so they can be accessed when a query / mutation is issued
        setmutationRef(mutationConvert)
        setConvert(queryConvert);
        const queryObject = {};
        // Now isolate the Non-Query/Mutation type fields 
        formatted.forEach((el, i)=>{
          let queryName;
          if (i !== queryIndex && i !== mutationIndex){
            for (let i = 0; i < el.length; i++){
              // Isolate the 'type' of the field ('Person', 'Film')
              if (el[i].includes("type")) {
                let fieldSplit = el[i].split("type");
                let field = fieldSplit[fieldSplit.length-1];
                const regex = /[A-Za-z]+/;
                const found = field.match(regex);
                queryName = found[0];
                queryObject[queryName] = {};
                break;
              }
            } 
            // Fill out queryObject with 'queryName' (Person) as property and fields (name) as values. Obj looks like: {Person: name, Person: age}
            el.forEach((prop) => {
              if (prop.includes(":")){
                let propSplit = prop.split(":");
                let fieldName = propSplit[0];
                if (propSplit[1].includes("[")) {
                  const regex = /[A-Za-z]+/;
                  const found = propSplit[1].match(regex);
                  queryObject[queryName][fieldName] = found[0];
                } else {
                  queryObject[queryName][fieldName] = false;
                }
              }
            })
          }
        })
        // add 'queryObject' to state so that query / mutation useEffect can access it
        setgraphObjRef(queryObject)
        const vizNodes = [];
        const vizEdges = [];
        // Creates central query node that connects all query "types"
        const queryNode = {id: "Query", label: "Query", color: 'rgba(90, 209, 104, 1)', widthConstraint:75, font: {size: 20, align: 'center'}}
        vizNodes.push(queryNode)
        //formats all "types", groups them with their fields by color, and sets them as nodes in vis.js graph.
        const colorArr = ['rgba(255, 153, 255, 1)','rgba(75, 159, 204, 1)','rgba(255, 102, 102, 1)','rgba(255, 255, 153, 1)','rgba(194, 122, 204, 1)', 'rgba(255, 204, 153, 1)', 'rgba(51, 204, 204, 1)']
        let colorPosition = 0;
        for (let key in queryObject){
          const node = {id: key, label: key, title: key, group: key, widthConstraint: 75, color2: colorArr[colorPosition], color: colorArr[colorPosition], font: {size: 16, align: 'center'}};
          vizNodes.push(node);
          vizEdges.push({from: "Query", to: key, length: 275})
          const prop = key;
          for (let childNode in queryObject[prop]) {
            const subNode = {id: prop + '.' + childNode, label: childNode, title: prop + '.' + childNode, group: prop, widthConstraint: 35, color2: colorArr[colorPosition], color: colorArr[colorPosition], font: {size: 10, align: 'center'}};
            vizNodes.push(subNode);
            vizEdges.push({from: prop, to: prop + '.' + childNode})  
          }
          colorPosition += 1;
        }
        // If green graph is currently rendered (via greenNode being truthy), set greenNode to false so that base graph shown (not the green graph)
        if (greenNode) {
          greenNodeOn(false)
        } 
        // use setGraph to render initial data
        setGraph({nodes: vizNodes, edges: vizEdges})
        // Deep clone of Nodes and Edges created to be used when creating a graph with green nodes (after query / mutation)
        setNodes(JSON.parse(JSON.stringify(vizNodes)));
        setEdges(JSON.parse(JSON.stringify(vizEdges)));
        //sending nodes and edges to store so that viz graph can persist between page views.
        dispatch({
          type: "nodes",
          payload: vizNodes
        })
        dispatch({
          type: "edges",
          payload: vizEdges
        })

      }}
      }, [updatedSchema])

    useEffect(() => {
      if (!props.fullGraph) {
      console.log('GREEN NODE USE EFFECT')
      // listening for change to store.query.extensions, this will change if new query is executed
      // greenObj will contain all the nodes that should turn green. ('Person', 'Person.gender')
      if (store.query.extensions) {
      const greenObj = {};
      const queryRes = store.query.data;
      const mutationRes = store.mutation;
      // queryHelp used to fill out greenObj for Queries
      const queryHelp = (data) => {
        // iterate through queries targeted ('people', 'planets')
        for (let key in data) {
          let val;
          if (key in convert) {
            // turn val into 'Person' if key is 'people'
            val = convert[key];
            greenObj[val] = true
            // If data[key][0] has a value of null:
            let newData; 
            let count = 0;
            while (!data[key][count]) {
              count += 1;
            }
            newData = data[key][count];
            for (let prop in newData) {
              const propValue = val + '.' + prop
              greenObj[propValue] = true;
              if (Array.isArray(newData[prop])) {
                const newObj = {};
                newObj[prop] = newData[prop];
                queryHelp(newObj)
              }
            }
          } 
        }   
      }
      // mutationHelp used to fill out greenObj for Mutations
      const mutationHelp = (data) => {
        // regex to match mutation type
        const regexTest = /[a-zA-Z ]+\([^\)]+\)/g
        const mutationArr = data.match(regexTest)
        mutationArr.forEach((el)=>{
          const mutationArrTrim = el.trim();
          const typeMutationArr = mutationArrTrim.split("(");
          const typeMutation = typeMutationArr[0].trim();
          const typeMutationConvert = mutationRef[typeMutation];
          greenObj[typeMutationConvert] = true;
          const fieldMutations = typeMutationArr[1].split(/(:)/)
          fieldMutations.forEach((el, i, arr)=>{
            if (arr[i+1] === ":") {
              const fieldSplit = el.split(/[ ]+/)
              const typeField = typeMutationConvert + '.' + fieldSplit[fieldSplit.length-1];
              greenObj[typeField] = true;
            }
          })
        })        
      }

      if ((queryRes && store.schema.schemaNew) || (store.mutation && store.schema.schemaNew)) {
        // for QUERY: this fills out greenObj with our fields for green nodes
        if (!store.mutation) {
          queryHelp(queryRes)
        } else {
          // for MUTATION: this fills out greenObj with fields for green nodes
          mutationHelp(mutationRes)
          dispatch({
            type: "mutation",
            payload: false
          });
        }
        // Need to create deep copy of 'nodes' and 'edges' so that each instance of green node graph does not persist (pass by ref issue)
        const nodeCopy = JSON.parse(JSON.stringify(nodes))
        const newNodeArr = nodeCopy.map((el)=> {
          // check if value is a key in greenObj, it true, turn its node color green
          if (greenObj[el.id]) {
            el.color = 'rgba(90, 209, 104, 1)'
            return el;
          } else {
            return el;
          }
        })
        const edgesArr = JSON.parse(JSON.stringify(edges))
        // We can now add connections between connector nodes via graphObjRef
        // iterate greenObj, find the value of greenObj key in graphObjRef, and if value is not 'true' add a edge between the value
        // and the key and push ege to edgesArr

        //formats the graphObjRef to have values of "true" or [type]
        const graphObjFormat = {};
        for (let key in graphObjRef) {
          for (let prop in graphObjRef[key]) {
            let value = key + '.' + prop;
            graphObjFormat[value] = graphObjRef[key][prop];
          }
        }
        for (let key in greenObj) {
          if (graphObjFormat[key]) {
            edgesArr.push({from: key, to: graphObjFormat[key]})
          }
        }
        //update store to have properties for green nodes and green edges, so that full page Viz view can use them.
        // MAKE SURE THIS DISPATCH DOES NOT OVERWRITE THE EXISTING DATA!!
        console.log("NODES BEING OVER-WRITTEN")
        console.log("NodesinUseEffect", store.greenNodes)

        // on initial render prevent this from running
        if (edgesArr.length !== 0) {
          dispatch({
            type: "greenEdges",
            payload: JSON.parse(JSON.stringify(edgesArr))
          })
          dispatch({
            type: "greenNodes",
            payload: JSON.parse(JSON.stringify(newNodeArr))
          })
        } 



        // if there are green nodes present, we need to update them via setData
        if (greenNode) {
          net.network.setData({
            edges: edgesArr, 
            nodes: newNodeArr,
          });
        }
        // if no green nodes currently, need to use setGraphGreen to create graph
        setGraphGreen({
          edges: edgesArr, 
          nodes: newNodeArr,
        })
        greenNodeOn(true);
      }
    }}
    }, [store.query.extensions])

    //distinguishing between fullGraph and quadrant views so green nodes update when toggling views.
    useEffect(()=> {
      if (props.fullGraph) {
        console.log('FULL GRAPH')
        console.log('FG edges', store.greenEdges)
        console.log('FG nodes', store.greenNodes)
        dispatch({
          type: "fullGraphVisit",
          payload: true
        })
        if (store.greenNodes) {
          if (greenNode) {
            net.network.setData({
              edges: store.greenEdges, 
              nodes: store.greenNodes
            });
          }
          setGraphGreen({
            edges: store.greenEdges, 
            nodes: store.greenNodes
          })
          greenNodeOn(true);

          // ADD TO STORE VERSION OF GREENEDGES/NODES THAT IS UNDER DIFFERENT TAG.
          // dispatch({
          //   type: "fullGreenEdges",
          //   payload: JSON.parse(JSON.stringify(store.fullGreenEdges))
          // })
          // dispatch({
          //   type: "fullGreenNodes",
          //   payload: JSON.parse(JSON.stringify(store.fullGreenNodes))
          // })


        } else {
          // render the store.edges and store.nodes
          setGraph({nodes: store.nodes, edges: store.edges});
        }
      }
      // 1. piece of state noting if returning from fullGraph

      // THIS DEALS WITH QUADRANT GRAPH
      if ((store.fullGraphVisit && store.greenNodes) && !props.fullGraph) {
        console.log('THIS SHOULD TRIGGER')
        console.log('EDGES', store.greenEdges)
        console.log('NODES', store.greenNodes)
        setGraphGreen({
          edges: JSON.parse(JSON.stringify(store.greenEdges)), 
          nodes: JSON.parse(JSON.stringify(store.greenNodes))
        })
        // net.network.setData({
        //   edges: store.greenEdges, 
        //   nodes: store.greenNodes
        // });
        greenNodeOn(true);
        dispatch({
          type: "fullGraphVisit",
          payload: false
        })
      }
      if ((store.fullGraphVisit && !store.greenNodes) && !props.fullGraph) {
        setGraphGreen({
          edges: JSON.parse(JSON.stringify(store.edges)), 
          nodes: JSON.parse(JSON.stringify(store.nodes))
        })
        // net.network.setData({
        //   edges: store.greenEdges, 
        //   nodes: store.greenNodes
        // });
        dispatch({
          type: "fullGraphVisit",
          payload: false
        })
      }






    // else if (store.fullGraphVisit && !store.greenNodes) {
    //   setGraph({nodes: store.nodes, edges: store.edges});
    //   dispatch({
    //     type: "fullGraphVisit",
    //     payload: false
    //   })
    // }
      // 2. if 
    }, [])  
	// Make query to User App's server API for updated GraphQL schema
	function requestSchema () {
    // DO A DISPATCH TO SET THE GREEN NODES TO FALSE
    dispatch({
      type: "greenEdges",
      payload: false
    })
    dispatch({
      type: "greenNodes",
      payload: false
    })


		fetch('http://localhost:3000/getSchema')
			.then(res => res.json())
			.then(res => saveSchema(res))
			.catch(err => console.log('Error with fetching updated schema from User app: ', err));
	}
	// Invokes when savedSchema state is updated, sending schema to indexeddb table of schema
	useEffect(() => {
		if (savedSchema) {
			schemaDB.add({ name: savedSchema })
				.then(id => {
					console.log('Schema ID Generated: ', id);
				})
				.catch(err => console.log("Error with schema database insertion: ", err))
				dispatch({
					type: "updateSchema",
					payload: savedSchema
        });
        updateSchema(updatedSchema + 1);
    }
	}, [savedSchema])
  
  const linkStyle = {
		"color": "#05445E",
		"textDecoration": "none",
	}
    return (
      <div>
      {!props.fullGraph && 
      <div className='topLeftButtons' id='vizQuadrant'>
        <button className="quadrantButton" id="updateSchema" key={2} onClick={requestSchema}>Import Schema</button>
        {store.schema.schemaNew && 
          <button className="quadrantButton">
            <Link to="/fullviz" style={linkStyle}>View Full Screen</Link>
          </button>
        }
      </div>
      }
      {props.fullGraph &&
        <button className="navButtons">
          <Link to="/" style={linkStyle}>Home</Link>
        </button>
      }
      {(store.schema.schemaNew && !greenNode) &&
      <div id='graphBox'>
        <Graph
          graph={graph}
          options={options}
          events={events}
        />
      </div>
      }

      {(store.schema.schemaNew && greenNode) &&
      <div id='graphBox'>
        <Graph
          graph={graphGreen}
          options={options}
          events={events}
          getNetwork={network => {
            //  if you want access to vis.js network api you can set the state in a parent component using this property
            setNet({ network })
          }}
        />
      </div>
      }
      </div>
    );
}

export default GraphViz