let imageData;
const tooltipPadding = 15;

const times = [
    {start: dayjs("2025-05-26 22:00:00"), end: dayjs("2025-05-29 16:45:00"), place: "Toronto", sunset: 20.82, sunrise: 5.68},
    {start: dayjs("2025-05-30 11:50:00"), end: dayjs("2025-06-01 08:00:00"), place: "Amsterdam", sunset: 21.85, sunrise: 5.42},
    {start: dayjs("2025-06-01 15:30:00"), end: dayjs("2025-06-06 18:10:00"), place: "Luxembourg", sunset: 21.62, sunrise: 5.52},
    {start: dayjs("2025-06-06 23:45:00"), end: dayjs("2025-06-09 11:15:00"), place: "Oslo", sunset: 22.55, sunrise: 3.98},
]

const resizeAndRender = () => {
    d3.selectAll("svg > *").remove();

    d3.selectAll("#full-temporal-visualization")
        .style("height", "50vh")
        .attr("width", d3.max([document.getElementById("full-temporal-visualization-container").clientWidth, 1.3 * document.getElementById("full-temporal-visualization").clientHeight]));

    renderVisualization();

    d3.selectAll("text")
        .attr("font-size", function() { return d3.select(this).attr("text-multiplier") * 0.008 * document.getElementById("full-temporal-visualization").clientWidth });

    d3.select("#tooltip")
        .style("border-radius", 0.02 * document.getElementById("full-temporal-visualization").clientHeight + "px");
};

window.onresize = resizeAndRender;

const setTooltip = (selection, innerHtml) => {
    selection
        .on('mouseover', (event, d) => {
            d3.select("#tooltip")
                .style("display", "block")
                .style("left", (event.pageX + tooltipPadding) + 'px')
                .style("top", (event.pageY + tooltipPadding) + 'px')
                .html(innerHtml(d));
        })
        .on("mousemove", (event, d) => {
            d3.select("#tooltip")
                .style("display", "block")
                .style("left", (event.pageX + tooltipPadding) + 'px')
                .style("top", (event.pageY + tooltipPadding) + 'px');
        })
        .on('mouseleave', () => {
            d3.select("#tooltip").style("display", "none");
        });
};

const setupFullTemporalVisualization = () => {
    const containerWidth = document.getElementById("full-temporal-visualization").clientWidth;
    const containerHeight = document.getElementById("full-temporal-visualization").clientHeight;

    const margin = {
        top: 0.00 * containerHeight,
        right: 0.00 * containerWidth,
        bottom: 0.0 * containerHeight,
        left: 0.00 * containerWidth
    };

    const width = containerWidth - (margin.right + margin.left);
    const height = containerHeight - (margin.top + margin.bottom);

    const svg = d3.select("#full-temporal-visualization");
    const topChartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    const middleChartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top + 5 * height / 11})`);
    const bottomChartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top + 6 * height / 11})`);

    const contentCategories = [...new Set(imageData.map(d => d.contents))];
    const reasonCategories = [...new Set(imageData.map(d => d.reason))];

    const dateDomain = [dayjs("2025-05-25 00:00:00"), dayjs("2025-06-11 00:00:00")];
    const contentBins = [];
    const reasonBins = [];
    const timeMiddles = [];
    const interval = 24;

    let currentTime = dateDomain[0];
    while (currentTime < dateDomain[1]) {
        contentCategories.forEach(cc => {
            contentBins.push({ category: cc, start: currentTime, middle: currentTime.add(interval / 2, "h"), end: currentTime.add(interval, "h"), count: 0 });
        });
        reasonCategories.forEach(rc => {
            reasonBins.push({ category: rc, start: currentTime, middle: currentTime.add(interval / 2, "h"), end: currentTime.add(interval, "h"), count: 0 });
        });
        timeMiddles.push(currentTime.add(interval / 2, "h"));

        currentTime = currentTime.add(interval, "h");
    }

    imageData.forEach(d => {
        contentBins.forEach(cb => {
            if (d.datetime > cb.start && d.datetime < cb.end && d.contents === cb.category) {
                cb.count += 1;
            }
        });
        reasonBins.forEach(rb => {
            if (d.datetime > rb.start && d.datetime < rb.end && d.reason === rb.category) {
                rb.count += 1;
            }
        });
    });

    const chartHeight = 5 * height / 11; 

    const xScale = d3.scaleTime()
        .domain([dayjs("2025-05-25 12:00:00"), dayjs("2025-06-10 12:00:00")])
        .range([width / 5, width]);
    const yScale = d3.scaleLinear()
        .domain([-47, 47])
        .range([chartHeight, 0]);
        
    const contentStackedData = d3.stack()
        .offset(d3.stackOffsetSilhouette)
        .keys(contentCategories)
        .value(([, group], key) => group.get(key).count)
        (d3.index(contentBins, d => d.middle, d => d.category))
        .map((data, i) => { return { category: contentCategories[i], data: data }; });
        
    const reasonStackedData = d3.stack()
        .offset(d3.stackOffsetSilhouette)
        .keys(reasonCategories)
        .value(([, group], key) => group.get(key).count)
        (d3.index(reasonBins, d => d.middle, d => d.category))
        .map((data, i) => { return { category: reasonCategories[i], data: data }; });

    var area = d3.area()
        .x((_, i) => xScale(timeMiddles[i]))
        .y0((d) => yScale(d[0]))
        .y1((d) => yScale(d[1]))
        .curve(d3.curveBumpX);

    let rowHeight = chartHeight / contentCategories.length;
    contentCategories.forEach((cc, i) => {
        topChartArea.append("circle")
            .attr("r", height / 45)
            .attr("cx", height / 45)
            .attr("cy", i * rowHeight + rowHeight / 2)
            .attr("fill", ["#1b9e77","#d95f02","#7570b3","#e7298a","#66a61e","#e6ab02","#a6761d","#666666"][i])
            .attr("stroke", "black")
            .attr("stroke-width", 0.5);
        
        topChartArea.append("text")
            .attr("transform", `translate(${height / 15}, ${i * rowHeight + rowHeight / 2})`)
            .attr("text-multiplier", 1.5)
            .attr("dominant-baseline", "middle")
            .text(cc + ` (total: ${imageData.filter(i => i.contents === cc).length})`);
    });
    
    topChartArea.selectAll(".layer")
        .data(contentStackedData)    
        .join("path")
        .attr("class", "layer")
        .attr("fill", (_, i) => ["#1b9e77","#d95f02","#7570b3","#e7298a","#66a61e","#e6ab02","#a6761d","#666666"][i])
        .attr("d", d => area(d.data))
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .on('mouseover', function(event, d) {
            d3.select(this).attr("stroke-width", 2).raise();

            d3.select("#tooltip")
                .style("display", "block")
                .style("left", (event.pageX + tooltipPadding) + 'px')
                .style("top", (event.pageY + tooltipPadding) + 'px')
                .html(`<b>${d.category}</b><br>
                    <i>Count: ${imageData.filter(i => i.contents === d.category).length}</i>`);
        })
        .on("mousemove", (event) => {
            d3.select("#tooltip")
                .style("display", "block")
                .style("left", (event.pageX + tooltipPadding) + 'px')
                .style("top", (event.pageY + tooltipPadding) + 'px');
        })
        .on('mouseleave', function() {
            d3.select(this).attr("stroke-width", 0.5);

            d3.select("#tooltip").style("display", "none");
        });

    rowHeight = chartHeight / reasonCategories.length;
    reasonCategories.forEach((rc, i) => {
        bottomChartArea.append("circle")
            .attr("r", height / 45)
            .attr("cx", height / 45)
            .attr("cy", i * rowHeight + rowHeight / 2)
            .attr("fill", ["#7fc97f","#beaed4","#fdc086","#ffff99","#386cb0","#f0027f","#bf5b17","#666666"][i])
            .attr("stroke", "black")
            .attr("stroke-width", 0.5);
        
        bottomChartArea.append("text")
            .attr("transform", `translate(${height / 15}, ${i * rowHeight + rowHeight / 2})`)
            .attr("text-multiplier", 1.5)
            .attr("dominant-baseline", "middle")
            .text(rc + ` (total: ${imageData.filter(i => i.reason === rc).length})`);
    });
    
    bottomChartArea.selectAll(".layer")
        .data(reasonStackedData)    
        .join("path")
        .attr("class", "layer")
        .attr("fill", (_, i) => ["#7fc97f","#beaed4","#fdc086","#ffff99","#386cb0","#f0027f","#bf5b17","#666666"][i])
        .attr("d", d => area(d.data))
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .on('mouseover', function(event, d) {
            d3.select(this).attr("stroke-width", 2).raise();

            d3.select("#tooltip")
                .style("display", "block")
                .style("left", (event.pageX + tooltipPadding) + 'px')
                .style("top", (event.pageY + tooltipPadding) + 'px')
                .html(`<b>${d.category}</b><br>
                    <i>Count: ${imageData.filter(i => i.reason === d.category).length}</i>`);
        })
        .on("mousemove", (event) => {
            d3.select("#tooltip")
                .style("display", "block")
                .style("left", (event.pageX + tooltipPadding) + 'px')
                .style("top", (event.pageY + tooltipPadding) + 'px');
        })
        .on('mouseleave', function() {
            d3.select(this).attr("stroke-width", 0.5);

            d3.select("#tooltip").style("display", "none");
        });

    middleChartArea.selectAll(".line")
        .data(times)
        .join("line")
        .attr("class", "line")
        .attr("x1", t => xScale(t.start))
        .attr("x2", t => xScale(t.end))
        .attr("y1", height / 33)
        .attr("y2", height / 33)
        .attr("stroke", "black")
        .attr("stroke-width", 1);

    middleChartArea.selectAll(".line-end")
        .data([].concat(...times.map(t => [t.start, t.end])))
        .join("line")
        .attr("class", "end")
        .attr("x1", t => xScale(t))
        .attr("x2", t => xScale(t))
        .attr("y1", height / 66)
        .attr("y2", height / 22)
        .attr("stroke", "black")
        .attr("stroke-width", 1);

    middleChartArea.selectAll(".text")
        .data(times)
        .join("text")
        .attr("class", "text")
        .attr("transform", t => `translate(${(xScale(t.end) + xScale(t.start)) / 2}, ${height / 17})`)
        .attr("text-anchor", "middle")
        .attr("text-multiplier", 1.5)
        .text(t => t.place);
};

const setupCityDayVisualization = () => {
    const containerWidth = document.getElementById("city-day-visualization-container").clientWidth;
    const containerHeight = document.getElementById("city-day-visualization-container").clientHeight;

    const colourMap = {
        "contents": {
            "animal": "#1b9e77",
            "object": "#d95f02",
            "view": "#7570b3",
            "me": "#e7298a",
            "food": "#66a61e",
            "room": "#e6ab02",
            "group": "#a6761d",
            "work": "#666666"
        },
        "reason": {
            "record": "#7fc97f",
            "funny": "#beaed4",
            "pretty": "#fdc086",
            "interesting": "#ffff99",
        }
    };

    const margin = {
        top: 0.03 * containerWidth / 4,
        right: 0.03 * containerWidth / 4,
        bottom: 0.03 * containerWidth / 4,
        left: 0.03 * containerWidth / 4
    };

    const chartWidth = containerWidth / 4 - margin.left - margin.right;

    ["contents", "reason"].forEach((category, i) => {
        times.forEach((time, j) => {

            const svg = d3.select("#city-day-visualization-" + (i * 4 + j + 1));

            const filteredData = imageData.filter(d => d.place === time.place);
            const hourCounts = [...Array(24).keys()].map(_ => 0);
            filteredData.forEach(d => {
                d.hour = d.datetime.hour();
                d.index = hourCounts[d.hour]++;
            });

            const chartArea = svg.append('g')
                .attr('transform', `translate(${margin.left + chartWidth / 2},${margin.top + chartWidth / 2})`);

            const rScale = d3.scaleLinear()
                .domain([0, d3.max(filteredData.map(d => d.index))])
                .range([chartWidth / 5, chartWidth / 2]);
            const tScale = d3.scaleLinear()
                .domain([0, 24])
                .range([-Math.PI / 2, 3 * Math.PI / 2]);

            const polaroids = chartArea.selectAll(".polaroid")
                .data(filteredData)
                .join("g");

            polaroids.selectAll(".polaroid-border")
                .data(d => [d])    
                .join("rect")
                .attr("class", "polaroid-border")
                .attr("fill", "white")
                .attr("stroke", "black")
                .attr("stroke-width", 0.5)
                .attr("x", d => rScale(d.index) * Math.cos(tScale(d.hour)) - chartWidth / 60)
                .attr("y", d => rScale(d.index) * Math.sin(tScale(d.hour)) - chartWidth / 50)
                .attr("width", chartWidth / 30)
                .attr("height", chartWidth / 25)
                .on('mouseover', function(event, d) {
                    d3.select("#tooltip")
                        .style("display", "block")
                        .style("left", (event.pageX + tooltipPadding) + 'px')
                        .style("top", (event.pageY + tooltipPadding) + 'px')
                        .html(`<img src="images/${d.filename}" width="${chartWidth}"><br>
                                <i>Date/Time: ${d.datetime.format("MMM D, H:mm")}</i><br>
                                <i>Content: ${d.contents}</i><br>
                                <i>Reason: ${d.reason}</i>`);
                })
                .on("mousemove", (event) => {
                    d3.select("#tooltip")
                        .style("display", "block")
                        .style("left", (event.pageX + tooltipPadding) + 'px')
                        .style("top", (event.pageY + tooltipPadding) + 'px');
                })
                .on('mouseleave', function(_, d) {
                    d3.select("#tooltip").style("display", "none");
                });

            polaroids.selectAll(".polaroid-image")
                .data(d => [d])    
                .join("rect")
                .attr("class", "polaroid-image")
                .attr("fill", d => colourMap[category][d[category]])
                .attr("x", d => rScale(d.index) * Math.cos(tScale(d.hour)) - chartWidth / 80)
                .attr("y", d => rScale(d.index) * Math.sin(tScale(d.hour)) - chartWidth / 70)
                .attr("width", chartWidth / 40)
                .attr("height", chartWidth / 40)
                .on('mouseover', function(event, d) {
                    d3.select("#tooltip")
                        .style("display", "block")
                        .style("left", (event.pageX + tooltipPadding) + 'px')
                        .style("top", (event.pageY + tooltipPadding) + 'px')
                        .html(`<img src="images/${d.filename}" width="${chartWidth}"><br>
                                <i>Date/Time: ${d.datetime.format("MMM D, H:mm")}</i><br>
                                <i>Content: ${d.contents}</i><br>
                                <i>Reason: ${d.reason}</i>`);
                })
                .on("mousemove", (event) => {
                    d3.select("#tooltip")
                        .style("display", "block")
                        .style("left", (event.pageX + tooltipPadding) + 'px')
                        .style("top", (event.pageY + tooltipPadding) + 'px');
                })
                .on('mouseleave', function(_, d) {
                    d3.select("#tooltip").style("display", "none");
                });

            chartArea.append("path")
                .attr("fill", "#053752")
                .attr("d", d3.arc()({
                    innerRadius: chartWidth / 8,
                    outerRadius: chartWidth / 7,
                    startAngle: tScale(0),
                    endAngle: tScale(24)
                }));

            chartArea.append("path")
                .attr("fill", "#EF810E")
                .attr("d", d3.arc()({
                    innerRadius: chartWidth / 8,
                    outerRadius: chartWidth / 7,
                    startAngle: tScale(time.sunrise) + Math.PI / 2,
                    endAngle: tScale(time.sunset) + Math.PI / 2
                }));

            chartArea.append("text")
                .attr("text-multiplier", 1)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .text(time.place);
        });
    });
};

const setupContentReasonVisualization = () => {
    const containerWidth = document.getElementById("content-reason-visualization-container").clientWidth;

    const margin = {
        top: 0.03 * containerWidth / 4,
        right: 0.03 * containerWidth / 4,
        bottom: 0.03 * containerWidth / 4,
        left: 0.03 * containerWidth / 4
    };

    const width = containerWidth - margin.left - margin.right;

    const svg = d3.select("#content-reason-visualization");

    const chartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const reasonColours = {
        "record": "#7fc97f",
        "funny": "#beaed4",
        "pretty": "#fdc086",
        "interesting": "#ffff99",
    };
        
    const groupedData = d3.groups(imageData, d => d.contents).sort((a, b) => b[1].length - a[1].length);
    groupedData.forEach(group => {
        group[1].sort((a, b) => Object.keys(reasonColours).findIndex(d => d === a.reason) - Object.keys(reasonColours).findIndex(d => d === b.reason))
    });

    let currentHeight = margin.top;

    const labelMargin = 0.1 * width;
    const itemWidth = width / 60;
    const itemWidthPlusMargin = itemWidth + 2;
    const itemHeight = width / 45;
    const itemHeightPlusMargin = itemHeight + 2;
    const numPerRow = Math.floor((width - labelMargin) / itemWidthPlusMargin)

    for (let i = 0; i < groupedData.length; i++) {
        const startHeight = currentHeight;
        currentHeight = startHeight + margin.top + itemHeightPlusMargin * Math.ceil(groupedData[i][1].length / numPerRow);

        const row = chartArea.append("g")
            .attr("transform", `translate(0, ${startHeight})`);

        row.append("text")
            .attr("text-multiplier", 2)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "top")
            .attr("transform", `translate(0, ${margin.top})`)
            .text(groupedData[i][0]);

        const polaroids = row.selectAll(".polaroid")
            .data(groupedData[i][1])
            .join("g")
            .attr("transform", (_, i) => `translate(${labelMargin + itemWidthPlusMargin * (i % numPerRow)}, ${itemHeightPlusMargin * Math.floor(i / numPerRow)})`);

        polaroids.selectAll(".polaroid-border")
            .data(d => [d])    
            .join("rect")
            .attr("class", "polaroid-border")
            .attr("fill", "white")
            .attr("stroke", "black")
            .attr("stroke-width", 0.5)
            .attr("x", -itemWidth / 2)
            .attr("y", -itemHeight / 2)
            .attr("width", itemWidth)
            .attr("height", itemHeight)
            .on('mouseover', function(event, d) {
                d3.select("#tooltip")
                    .style("display", "block")
                    .style("left", (event.pageX + tooltipPadding) + 'px')
                    .style("top", (event.pageY + tooltipPadding) + 'px')
                    .html(`<img src="images/${d.filename}" width="${width / 4}"><br>
                            <i>Date/Time: ${d.datetime.format("MMM D, H:mm")}</i><br>
                            <i>Content: ${d.contents}</i><br>
                            <i>Reason: ${d.reason}</i>`);
            })
            .on("mousemove", (event) => {
                d3.select("#tooltip")
                    .style("display", "block")
                    .style("left", (event.pageX + tooltipPadding) + 'px')
                    .style("top", (event.pageY + tooltipPadding) + 'px');
            })
            .on('mouseleave', function(_, d) {
                d3.select("#tooltip").style("display", "none");
            });

        polaroids.selectAll(".polaroid-image")
            .data(d => [d])    
            .join("rect")
            .attr("class", "polaroid-image")
            .attr("fill", d => reasonColours[d.reason])
            .attr("x", -itemWidth * 0.4)
            .attr("y", -itemWidth * 0.4)
            .attr("width", itemWidth * 0.8)
            .attr("height", itemWidth * 0.8)
            .on('mouseover', function(event, d) {
                d3.select("#tooltip")
                    .style("display", "block")
                    .style("left", (event.pageX + tooltipPadding) + 'px')
                    .style("top", (event.pageY + tooltipPadding) + 'px')
                    .html(`<img src="images/${d.filename}" width="${width / 4}"><br>
                            <i>Date/Time: ${d.datetime.format("MMM D, H:mm")}</i><br>
                            <i>Content: ${d.contents}</i><br>
                            <i>Reason: ${d.reason}</i>`);
            })
            .on("mousemove", (event) => {
                d3.select("#tooltip")
                    .style("display", "block")
                    .style("left", (event.pageX + tooltipPadding) + 'px')
                    .style("top", (event.pageY + tooltipPadding) + 'px');
            })
            .on('mouseleave', function(_, d) {
                d3.select("#tooltip").style("display", "none");
            });
    }

    d3.selectAll("#content-reason-visualization")
        .style("height", currentHeight + "px");
};

const renderVisualization = () => {
    setupFullTemporalVisualization();
    setupCityDayVisualization();
    setupContentReasonVisualization();
};

Promise.all([d3.json('data/image-data-3-with-colours.json')]).then(([_imageData]) => {
    imageData = _imageData;
    imageData.forEach(image => {
        image.datetime = dayjs(image.datetime.split(" ").map((c, i) => i === 0 ? c.replaceAll(":", "-") : c).join(" "));
        image.place = "Travel";
        times.forEach(time => {
            if (image.datetime > time.start && image.datetime < time.end) {
                image.place = time.place;
            }
        });
    });

    resizeAndRender();
});