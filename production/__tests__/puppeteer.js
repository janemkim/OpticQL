const puppeteer = require("puppeteer");

const APP = `http://localhost:8080/`

describe("Front-end Integration/Features", () => {
	let page;
	let browser;

	beforeEach(async () => {
		browser = await puppeteer.launch({
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
			headless: true,
		});
		page = await browser.newPage();
	});

	afterAll(async () => {
		await browser.close();
	});

	describe("initial load", () => {
		it("loads successfully", async () => {
			// We navigate to the page at the beginning of each case so we have a fresh start
			await page.goto(APP);
			await page.waitForSelector("#queryDisplay");
			const title = await page.$eval("#queryPlaceholder", (el) => el.innerHTML);
			expect(title).toBe("No query results to display");
		});

		it("child elements load", async () => {
			// We navigate to the page at the beginning of each case so we have a fresh start
			await page.goto(APP);
			await page.waitForSelector("#mainContainer");
			const childNodes = await page.$eval(
				"#mainContainer",
				(el) => el.childNodes.length
			);
			expect(childNodes).toBe(4);
		});

		it("top row child elements load", async () => {
			await page.goto(APP);
			await page.waitForSelector("#topRow");
			const childNodes = await page.$eval(
				"#topRow",
				(el) => el.childNodes.length
			);
			expect(childNodes).toBe(2);
		});

		it("bottom row child elements load", async () => {
			await page.goto(APP);
			await page.waitForSelector("#bottomRow");
			const childNodes = await page.$eval(
				"#bottomRow",
				(el) => el.childNodes.length
			);
			expect(childNodes).toBe(2);
		});
	});



	describe("Schema Viz Loads", () => {
		it("import schema works", async () => {
			await page.goto(APP);
			await page.waitForSelector("#graphViz");
			await page.click("#updateSchema", async (el) => {
				const graphLoad = (await page.$("#graphBox")) !== null;
				expect(graphLoad).toBe(true);
				const fullVizBut = (await page.$("#fullVizClick")) !== null;
				expect(fullVizBut).toBe(true);
			});
		});
	});

	describe("Codemirror input", () => {
		it('displays text in codemirror box', async () => {
			await page.goto(APP);
			await page.waitForSelector('#controlPanel');
			await page.click('.ReactCodeMirror')
			await page.focus('.ReactCodeMirror');
			await page.keyboard.type('{people{gender}}');
			const inputValue = await page.$eval('textarea', (el) => el.value);
			expect(inputValue).toBe('{people{gender}}');
		});

		it('submits a query and the response metric box, 3 buttons (response, metrics, errors) shows', async () => {
			await page.goto(APP);
			await page.waitForSelector('#controlPanel');
			await page.click('.ReactCodeMirror')
			await page.focus('.ReactCodeMirror');
			await page.keyboard.type('{people{gender}}');
			await page.click("#submitQuery")
			await page.waitForSelector('#responseButtons')
			const childNodes = await page.$eval(
				"#responseButtons",
				(el) => el.childNodes.length
			);
			expect(childNodes).toBe(3)
			//the result window should be true 
			const resultWindow = (await page.$('#queryScroll')) !== null;
			expect(resultWindow).toBe(true)

		});
		it('loads the performance metrics button', async () => {
			await page.goto(APP);
			await page.waitForSelector('#controlPanel');
			await page.click('.ReactCodeMirror')
			await page.focus('.ReactCodeMirror');
			await page.keyboard.type('{people{gender}}');
			await page.click("#submitQuery")
			await page.waitForSelector('.performanceMetricsButtonInfo')
			const childNodes = await page.$eval(
				".performanceMetricsButtonInfo",
				(el) => el.childNodes.length
			);
			expect(childNodes).toBe(4)
		});

		it('loads the performance metrics graph', async () => {
			await page.goto(APP);
			await page.waitForSelector('#controlPanel');
			await page.click('.ReactCodeMirror')
			await page.focus('.ReactCodeMirror');
			await page.keyboard.type('{people{gender}}');
			await page.click("#submitQuery")
			await page.waitForSelector('.chartContainerDiv')
			const chartGraph = (await page.$('.chartContainerDiv')) !== null;
			expect(chartGraph).toBe(true)
		});


	});


	describe("Full Screen View loads", () => {
		it("loads new page for graph", async () => {
			await page.goto(APP);
			await page.waitForSelector("#graphViz");
			await page.click("#updateSchema", async (el) => {
				await page.click("#fullVizClick", async (el) => {
					const pageTwo = await browser.newPage();
					await pageTwo.goto('http://localhost:8080/#/fullviz');

					await pageTwo.waitForSelector(".fullpageViz");
					const childNodes = await page.$eval(
						".fullpageViz",
						(el) => el.childNodes.length
					);
					console.log("childNodes", childNodes)
					expect(childNodes).toBe(4);
				})
			});
		});

		it("displays a node graph", async () => {
			await page.goto(APP);
			await page.waitForSelector("#graphViz");
			await page.click("#updateSchema", async (el) => {
				await page.click("#fullVizClick", async (el) => {
					const page = await browser.newPage();
					await page.goto('http://localhost:8080/#/fullviz');
					await page.waitForSelector(".fullpageViz");
					const graphLoad = (await page.$("#graphBox")) !== null;
					expect(graphLoad).toBe(true);
					const homeBut = (await page.$(".quadrantButton")) !== null;
					expect(homeBut).toBe(true);

				})
			});
		});

		it("goes back to homepage", async () => {
			await page.goto(APP);
			await page.waitForSelector("#graphViz");
			await page.click("#updateSchema", async (el) => {
				await page.click("#fullVizClick", async (el) => {
					const newpage = await browser.newPage();
					await newpage.goto('http://localhost:8080/#/fullviz');
					await newpage.waitForSelector(".fullpageViz");
					await newpage.click(".quadrantButton", async (el) => {
						const pagetwo = await browser.newPage();
						await pagetwo.goto("http://localhost:8080/#/");
						await pagetwo.waitForSelector("#mainContainer");
						const childNodes = await page.$eval(
							"#mainContainer",
							(el) => el.childNodes.length
						);
						expect(childNodes).toBe(4);
					})
				})
			});
		});
	});

	xdescribe('Database functionality', () => {
		it('Successfully clears out database', async () => {
			await page.goto(APP);
			await page.waitForSelector("#dbClearButton");
			await page.click("#dbClearButton");
			await page.on('dialog', async (dialog) => {
				expect(dialog.message()).toBe('Query database fully deleted');
				await dialog.accept();
			})
		})
	});

	// xdescribe("TEST", () => {
	// 	it("displays a usable input field for queries or mutations", async () => {
	// 		await page.goto(APP);
	// 		// await page.waitForSelector("#controlPanel");
	// 		await page.waitForSelector("#submitQuery");
	// 		// await page.$eval('#link', elem => elem.click()); 

	// 		// await page.evaluate(() => {
	// 		// 	let dom = document.querySelector("textarea");
	// 		// 	dom.innerHTML = "{people {name}}";
	// 		// });
	// 		console.log('Works here')
	// 		await page.click("#submitQuery", () => {
	// 			page.on('dialog', async dialog => {
	// 				console.log(dialog.message());
	// 				expect(dialog.message()).toBe('Please input a valid query/mutation request abcde');
	// 				await dialog.dismiss();
	// 				// await browser.close();
	// 			});
	// 		})
	// 	}, 15000);
	// });

	// browser.close();
});
