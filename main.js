let flavourMapping, locations, storeMapping, votes;
const tooltipPadding = 15;

const resizeAndRender = () => {
    d3.selectAll("svg > *").remove();
    d3.selectAll("#map > *").remove();

    d3.selectAll("#map")
        .style("height", "50vh")
        .style("border-radius", 0.05 * document.getElementById("map").clientHeight + "px");

    d3.selectAll("#vote-visualization")
        .style("height", "50vh")
        .attr("width", d3.max([document.getElementById("vote-visualization-container").clientWidth, 1.3 * document.getElementById("vote-visualization").clientHeight]));

    d3.selectAll("#sankey-visualization")
        .style("height", "50vh")
        .attr("width", d3.max([document.getElementById("sankey-visualization-container").clientWidth, 1 * document.getElementById("sankey-visualization").clientHeight]));

    renderVisualization();

    d3.selectAll("text")
        .attr("font-size", function() { return d3.select(this).attr("text-multiplier") * 0.008 * document.getElementById("map").clientWidth });

    d3.select("#tooltip")
        .style("border-radius", 0.02 * document.getElementById("map").clientHeight + "px");
};

window.onresize = resizeAndRender;

const setupMapVisualization = () => {
      mapboxgl.accessToken = 'pk.eyJ1IjoibWFyYXNvbGVuIiwiYSI6ImNtY2R0N25yczA5eGcya29tdWlkMG11amQifQ.6x047MR13736Mn7yBE6fiA';

      const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-123.150000, 49.285],
        zoom: 11.5
      });

      for (const feature of locations) {
        const el = document.createElement('div');
        el.className = 'marker ' + feature.properties.title.replaceAll(" ", "").toLowerCase() + "-marker";


        new mapboxgl.Marker(el)
          .setLngLat(feature.geometry.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(
                `<h3>${feature.properties.title}</h3><p>${feature.properties.address}</p>`
              )
          )
          .addTo(map);
      }
};

const setupVoteVisualization = () => {
    const containerWidth = document.getElementById("vote-visualization").clientWidth;
    const containerHeight = document.getElementById("vote-visualization").clientHeight;

    const margin = {
        top: 0.1 * containerHeight,
        right: 0.05 * containerWidth,
        bottom: 0.2 * containerHeight,
        left: 0.05 * containerWidth
    };

    const width = containerWidth - (margin.right + margin.left);
    const height = containerHeight - (margin.top + margin.bottom);

    const svg = d3.select("#vote-visualization");
    const chartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const xAxisG = chartArea.append('g')
        .attr('class', 'axis x-axis')
        .attr("transform", `translate(0, ${height})`);

    chartArea.append('defs')
        .append('clipPath')
        .attr('id', 'top-chart-mask')
        .append('rect')
        .attr('width', width)
        .attr('height', height);

    const chart = chartArea.append("g")
        .attr('clip-path', 'url(#top-chart-mask)');

    const xScale = d3.scaleBand()
        .range([0, width]);
    const yScale = d3.scaleLinear()
        .range([height, 0])
        .domain([0, 9]);

    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%B 1st'))
        .tickSizeOuter(0);

    const slider = document.getElementById("myRange");

    const renderVoteChart = (secondVoteValue) => {
        let data = {
            "A1": [0, 0],
            "A2": [0, 0],
            "B1": [0, 0],
            "B2": [0, 0],
            "C1": [0, 0],
            "C2": [0, 0],
            "D1": [0, 0],
            "D2": [0, 0]
        }

        votes.forEach(v => {
            data[v.v1][0] += 1;
            data[v.v2][1] += secondVoteValue;
        });

        data = Object.entries(data);
        data.sort((a, b) => b[1][0] + b[1][1] - (a[1][0] + a[1][1]));

        xScale.domain(data.map(d => d[0]));

        chart.selectAll(".bars")
            .data(data, d => d[0])
            .join("rect")
            .attr("class", "bars")
            .attr("fill", "#D7C560")
            .attr("stroke", "white")
            .attr("stroke-width", "2px")
            .attr("rx", width * 0.007)
            .attr("ry", width * 0.007)
            .attr("width", xScale.bandwidth())
            .attr("height", 2 * height)
            .transition()
            .duration(400)
            .attr("x", d => xScale(d[0]))
            .attr("y", d => yScale(d[1][0] + d[1][1]));

        chart.selectAll(".second-bars")
            .data(data, d => d[0])
            .join("rect")
            .attr("class", "second-bars")
            .attr("fill", "#B6B2B2")
            .attr("stroke", "white")
            .attr("stroke-width", "2px")
            .attr("rx", width * 0.007)
            .attr("ry", width * 0.007)
            .attr("width", xScale.bandwidth())
            .attr("height", 2 * height)
            .transition()
            .duration(400)
            .attr("x", d => xScale(d[0]))
            .attr("y", d => yScale(d[1][1]) + 2);

        chartArea.selectAll(".labels")
            .data(data, d => d[0])
            .join("text")
            .attr("class", "labels")
            .attr("text-multiplier", 1)
            .attr("text-anchor", "middle")
            .text(d => flavourMapping[d[0]])
            .transition()
            .duration(400)
            .attr("x", d => xScale(d[0]) + 0.5 * xScale.bandwidth())
            .attr("y", d => yScale(d[1][0] + d[1][1]) - 10);

        chartArea.selectAll(".logos")
            .data(data, d => d[0])
            .join("image")
            .attr("class", "logos")
            .attr("width", xScale.bandwidth() * 0.9)
            .attr("y", height + 10)
            .attr("xlink:href", d => "images/" + storeMapping[d[0].substring(0, 1)].replaceAll(" ", "").replaceAll("'", "") + ".png")
            .transition()
            .duration(400)
            .attr("x", d => xScale(d[0]) + 0.05 * xScale.bandwidth());
    };

    // Update the current slider value (each time you drag the slider handle)
    slider.onmouseup = function() {
        renderVoteChart(this.value / 100);
    }

    renderVoteChart(slider.value / 100);
};

const setupSankeyVisualization = () => {
    const containerWidth = document.getElementById("sankey-visualization").clientWidth;
    const containerHeight = document.getElementById("sankey-visualization").clientHeight;

    const margin = {
        top: 0 * containerHeight,
        right: 0 * containerWidth,
        bottom: 0.1 * containerHeight,
        left: 0 * containerWidth
    };

    const width = containerWidth - (margin.right + margin.left);
    const height = containerHeight - (margin.top + margin.bottom);

    const svg = d3.select("#sankey-visualization");
    const chartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const sankey = d3.sankey()
        .nodeWidth(width * 0.04)
        .nodePadding(width * 0.01)
        .nodeId(d => d.name)
        .size([width, height]);

    let graph = {
        nodes: [...Object.keys(flavourMapping).map(d => d + "-v1"), ...Object.keys(flavourMapping).map(d => d + "-v2")].map(d => { return { name: d } }),
        links: []
    };

    const links = [];

    votes.forEach(vote => {
        if (vote.v1 + "-" + vote.v2 in links) {
            links[vote.v1 + "-" + vote.v2] += 1;
        } else {
            links[vote.v1 + "-" + vote.v2] = 1;
        }
    });

    Object.entries(links).forEach(link => {
        graph.links.push({source: link[0].split("-")[0] + "-v1", target: link[0].split("-")[1] + "-v2", value: link[1]});
    });

    console.log(graph)
    
    graph = sankey(graph);
    
    const colourScale = d3.scaleOrdinal(Object.keys(flavourMapping), ["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f","#ff7f00"]);
    console.log(colourScale("B2"))
    console.log(colourScale("D2"))

    console.log(graph.nodes)

    // add in the links
    chartArea.selectAll(".link")
        .data(graph.links.filter(l => l.width > 0))
        .join("path")
        .attr("class", "link")
        .attr("d", d3.sankeyLinkHorizontal())
        .style("stroke-width", d => d.width)
        .attr("stroke", d => colourScale(d.source.name.substring(0, 2)))
        .attr("opacity", 0.3)
        .attr("fill", "none");

    // add in the nodes
    chartArea.selectAll(".node")
        .data(graph.nodes)
        .join("rect")
        .attr("class", "node")
        .attr("fill", d => colourScale(d.name.substring(0, 2)))
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", sankey.nodeWidth())
        .attr('stroke-width', 1)
        .attr("stroke", "black")

    // add in the title for the nodes
    chartArea.selectAll(".node-text")
        .data(graph.nodes.filter(n => n.y1 - n.y0 > 0))
        .join("text")
        .attr("class", "node-text")
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("x", d => d.name.substring(3, 5) === "v1" ? d.x1 + 6 : d.x0 - 6)
        .attr("text-multiplier", 1.5)
        .attr("text-anchor", d => d.name.substring(3, 5) === "v1" ? "start" : "end")
        .text(d => flavourMapping[d.name.substring(0, 2)]);
};

const renderVisualization = () => {
    setupMapVisualization();
    setupVoteVisualization();
    setupSankeyVisualization();
};

Promise.all([d3.json('data/flavour-mapping.json'), d3.json('data/locations.json'), d3.json('data/store-mapping.json'), d3.csv('data/votes.csv')]).then(([_flavourMapping, _locations, _storeMapping, _votes]) => {
    flavourMapping = _flavourMapping;
    locations = _locations;
    storeMapping = _storeMapping;
    votes = _votes;

    resizeAndRender();
});