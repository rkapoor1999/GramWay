d3.csv("./data/Top_Influencers.csv")
    .then(rawData => {
        const processedData = rawData
            .map(d => {
                    const channelInfo = d['Channel Info']
                    const processVals = (value) => {
                        if (!value) return 0;
                        value = value.toString().toLowerCase();
                        const multipliers = { b: 1e9, m: 1e6, k: 1e3 };
                        const suffix = value.slice(-1);
                        const multiplier = multipliers[suffix] || 1;
                        return parseFloat(value) * multiplier || 0;
                    };
                    console.log("data looding");
                    return {
                        rank: parseInt(d.Rank) || (console.error('null rank')),
                        channel_info: channelInfo,
                        influence_score: parseFloat(d['Influence Score']),
                        followers: processVals(d.Followers),
                        avg_likes: processVals(d['Avg. Likes']),
                        posts: processVals(d.Posts),
                        engagement_rate: parseFloat(d['60-Day Eng Rate']),
                        total_likes: processVals(d['Total Likes']),
                        country: d['Country Or Region'] || 'Not Available'
                    };
            })
            .filter(d => d !== null && d.followers > 0)
            .slice(0, 50);

        const arcFormat = d3.format(".2s");
        const minIScore = d3.min(processedData, d => d.influence_score);
        const maxIScore = d3.max(processedData, d => d.influence_score);

        //svg dimention initialise
        const margin = { top: 50, right: 250, bottom: 50, left: 50 }; 
        const width = 1400 - margin.left - margin.right;
        const height = 1000 - margin.top - margin.bottom;

        d3.select('#visualization svg').remove();
        console.log("saaf");
        d3.selectAll('.tooltip').remove();

        //scales
        const radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(processedData, d => d.followers)])
            .range([1, 30]);

        const colorScale = d3.scaleLinear()
            .domain([
                minIScore,
                maxIScore
            ])
            .range(['#4a90e2', '#ff6b6b']);

        const postsScale = d3.scaleSqrt()
            .domain([0, d3.max(processedData, d => d.posts)])
            .range([1, 19]);

        const likesScale = d3.scaleSqrt()
            .domain([0, d3.max(processedData, d => d.avg_likes)])
            .range([1, 19]);

        const engagementScale = d3.scaleSqrt()
            .domain([0, d3.max(processedData, d => d.engagement_rate)])
            .range([1, 19]);

        function calculateStarRadius(d) {
            return radiusScale(d.followers);
        }

        //svg -> make
        const svg = d3.select('#visualization')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', '#111');

        const defs = svg.append('defs');
        const gradient = defs.append('radialGradient')
            .attr('id', 'star-gradient')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', '50%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#fff')
            .attr('stop-opacity', 1);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#fff')
            .attr('stop-opacity', 0);

        //force simluations 
        const angleStep = (2 * Math.PI) / processedData.length;
        processedData.forEach((d, i) => {
            const angle = i * angleStep;
            const radius = Math.min(width, height) / 3.5;
            d.x = width/2 + radius * Math.cos(angle);
            d.y = height/2 + radius * Math.sin(angle);
            console.log("fs chaalu");
        });

        const simulation = d3.forceSimulation(processedData)
            .force('charge', d3.forceManyBody().strength(-50))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => calculateStarRadius(d) + 50).strength(0.8))
            .force('x', d3.forceX(width / 2).strength(0.05))
            .force('y', d3.forceY(height / 2).strength(0.05))
            .alphaDecay(0.02)
            .velocityDecay(0.3);

        //stars
        const starSystemsContainer = svg.append('g')
            .attr('class', 'star-systems-container');

        const starSystems = starSystemsContainer.selectAll('.star-system')
            .data(processedData)
            .enter()
            .append('g')
            .attr('class', 'star-system')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        starSystems.append('circle')
            .attr('class', 'star')
            .attr('r', d => calculateStarRadius(d))
            .style('fill', d => colorScale(d.influence_score))
            .style('filter', 'url(#star-gradient)');

        //planets
        const planetData = d => {
            const radius = calculateStarRadius(d);
            return [
                {
                    type: 'posts',
                    value: d.posts,
                    orbitRadius: radius + 20,
                    size: postsScale(d.posts),
                    color: '#ff6b6b',
                    shape: 'square'
                },
                {
                    type: 'likes',
                    value: d.avg_likes,
                    orbitRadius: radius + 35,
                    size: likesScale(d.avg_likes),
                    color: '#4a90e2',
                    shape: 'triangle'
                },
                {
                    type: 'engagement',
                    value: d.engagement_rate,
                    orbitRadius: radius + 50,
                    size: engagementScale(d.engagement_rate),
                    color: '#4ade80',
                    shape: 'diamond'
                }
            ];
        };

        const planets = starSystems.selectAll('.planet-group')
            .data(d => planetData(d))
            .enter()
            .append('g')
            .attr('class', 'planet-group');

        //planet orbit
        planets.append('circle')
            .attr('class', 'orbit')
            .attr('r', d => d.orbitRadius)
            .style('stroke', d => d.color)
            .style('stroke-opacity', 0.2)
            .style('fill', 'none');

        //posts, likes, engagement
        planets.each(function(d) {
            const group = d3.select(this);
            
            if (d.shape === 'square') {
                group.append('rect')
                    .attr('x', d => d.orbitRadius - d.size/2)
                    .attr('y', -d.size/2)
                    .attr('width', d => d.size)
                    .attr('height', d => d.size)
                    .style('fill', d.color);
            }
            else if (d.shape === 'triangle') {
                const traingleOrbit = d => {
                    const h = d.size;
                    const w = d.size;
                    return `M ${d.orbitRadius},${-h/2} 
                            L ${d.orbitRadius + w/2},${h/2} 
                            L ${d.orbitRadius - w/2},${h/2} Z`;
                };
                
                group.append('path')
                    .attr('d', traingleOrbit)
                    .style('fill', d.color);
            }
            else if (d.shape === 'diamond') {
                const diamonOrbit = d => {
                    const s = d.size/2;
                    return `M ${d.orbitRadius},${-s} 
                            L ${d.orbitRadius + s},0 
                            L ${d.orbitRadius},${s} 
                            L ${d.orbitRadius - s},0 Z`;
                };
                
                group.append('path')
                    .attr('d', diamonOrbit)
                    .style('fill', d.color);
            }
        });

        //username diaplay
        starSystems.append('text')
            .attr('class', 'star-label')
            .attr('text-anchor', 'middle')
            .attr('dy', d => -calculateStarRadius(d) - 10)
            .text(d => d.channel_info)
            .style('fill', '#fff')
            .style('font-size', '12px')
            .style('pointer-events', 'none');

        //tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', '#fff')
            .style('padding', '10px')
            .style('border-radius', '4px');

        //interaction
        starSystems
            .on('mouseover', function(event, d) {
                d3.select(this).style('opacity', 0.7);
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                console.log(arcFormat);
                tooltip.html(`
                    <strong>${d.channel_info}</strong><br/>
                    <hr style="margin: 5px 0; border-color: rgba(255,255,255,0.2)"/>
                    Rank: #${d.rank}<br/>
                    Country: ${d.country}<br/>
                    Followers: ${arcFormat(d.followers)}<br/>
                    Influence Score: ${d.influence_score}<br/>
                    <hr style="margin: 5px 0; border-color: rgba(255,255,255,0.2)"/>
                    Posts: ${d.posts}<br/>
                    Avg Likes: ${arcFormat(d.avg_likes)}<br/>
                    Engagement Rate: ${d3.format(".1f")(d.engagement_rate * 100)}%
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).style('opacity', 1);
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        //aniamitons
        simulation.on('tick', () => {
            starSystems.attr('transform', d => {
                const x = Math.max(50, Math.min(width - 50, d.x));
                const y = Math.max(50, Math.min(height - 50, d.y));
                return `translate(${x},${y})`;
            });
        });

        let rotation = 0;
        function orbitAnimaiton() {
            rotation = (rotation + 0.5) % 360;
            planets.attr('transform', `rotate(${rotation})`);
            requestAnimationFrame(orbitAnimaiton);
        }
        orbitAnimaiton();

        //legend - pend:shift right
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width + margin.right - 200}, 20)`);

        const legData = [
            { 
                label: 'Posts', 
                color: '#ff6b6b',
                shape: 'square',
                description: 'Size shows number of posts'
            },
            { 
                label: 'Avg Likes', 
                color: '#4a90e2',
                shape: 'triangle',
                description: 'Size shows average likes'
            },
            { 
                label: 'Engagement', 
                color: '#4ade80',
                shape: 'diamond',
                description: 'Size shows engagement rate'
            }
        ];

        const legItems = legend.selectAll('.legend-item')
            .data(legData)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 60})`);

        legItems.each(function(d) {
            const group = d3.select(this);
            const size = 10;
            
            if (d.shape === 'square') {
                group.append('rect')
                    .attr('width', size)
                    .attr('height', size)
                    .attr('y', -size/2)
                    .style('fill', d.color);
            }
            else if (d.shape === 'triangle') {
                group.append('path')
                    .attr('d', `M 0,${-size/2} L ${size/2},${size/2} L ${-size/2},${size/2} Z`)
                    .style('fill', d.color);
            }
            else if (d.shape === 'diamond') {
                group.append('path')
                    .attr('d', `M 0,${-size/2} L ${size/2},0 L 0,${size/2} L ${-size/2},0 Z`)
                    .style('fill', d.color);
            }
        });

        legItems.append('text')
            .attr('x', 20)
            .attr('y', 0)
            .style('fill', '#fff')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text(d => d.label);

        legItems.append('text')
            .attr('x', 20)
            .attr('y', 20)
            .style('fill', '#aaa')
            .style('font-size', '12px')
            .text(d => d.description);

        //gradient bar for influence score
        const iScoreGrad = defs.append('linearGradient')
            .attr('id', 'infliuncer-score-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        iScoreGrad.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', colorScale.range()[0]);

        iScoreGrad.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', colorScale.range()[1]);

        const gradLeg = svg.append('g')
            .attr('class', 'gradient-legend')
            .attr('transform', `translate(${width + margin.right - 200}, 200)`); //just below post, like, engagement legend

        gradLeg.append('text')
            .attr('x', 0)
            .attr('y', 10)
            .style('fill', '#fff')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Influence Score');

                //main-bar
        gradLeg.append('rect')
            .attr('x', 0)
            .attr('y', 20)
            .attr('width', 150)
            .attr('height', 15)
            .style('fill', 'url(#infliuncer-score-gradient)');

        gradLeg.append('text')
            .attr('x', 0)
            .attr('y', 50)
            .style('fill', '#aaa')
            .style('font-size', '12px')
            .text(arcFormat(minIScore));

        gradLeg.append('text')
            .attr('x', 150)
            .attr('y', 50)
            .style('text-anchor', 'end')
            .style('fill', '#aaa')
            .style('font-size', '12px')
            .text(arcFormat(maxIScore));
    })