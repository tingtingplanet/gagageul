import { arraysEqual, arrayToKeyMap } from "../utils";
import { guelPrecedenceMap, precedenceMap } from "./analysisPrecedence";
import { MultiDiGraph } from "./multidigraph";
import { Char, CustomConditionEngine, CustomConditionState } from "./WordChain";
// export const deepCopyCustomConditionState: (
// 	obj: CustomConditionState
// ) => CustomConditionState = (obj: CustomConditionState) => {
// 	return {
// 		...obj,
// 		customCondition: {
// 			...obj.customCondition,
// 			exceptWords: [...obj.customCondition.exceptWords],
// 			includeWords: [...obj.customCondition.includeWords],
// 		},
// 	};
// };

export function pruningWinLos(
	chanGraph: MultiDiGraph,
	wordGraph: MultiDiGraph
) {
	const wordLos = Object.keys(wordGraph.nodes).filter(
		(e) => wordGraph.successors(e).length === 0
	);

	wordLos.forEach((e) => {
		wordGraph.nodes[e].type = "los";
		wordGraph.nodes[e].endNum = 0;
	});

	chanGraph.removeInEdge(wordLos);

	let chanLos = Object.keys(chanGraph.nodes).filter(
		(e) => chanGraph.successors(e).length === 0
	);

	chanLos.forEach((e) => {
		chanGraph.nodes[e].type = "los";
		chanGraph.nodes[e].endNum = 0;
	});

	while (true) {
		const wordWin: Char[] = [];
		for (const cl of chanLos) {
			// 지는 음절
			const preds = wordGraph.predecessors(cl);
			preds.forEach((e) => {
				wordWin.push(e);
				wordGraph.nodes[e].solution = cl;
				wordGraph.nodes[e].type = "win";
				wordGraph.nodes[e].endNum = (chanGraph.nodes[cl].endNum as number) + 1;
				wordGraph.removeOutEdge(e); // 이긴 음절에서 지는 음절로 가는 간선 제거
			});
		}

		if (wordWin.length === 0) break;

		const chanWin: Char[] = [];

		for (const ww of wordWin) {
			const preds = chanGraph.predecessors(ww);
			preds.forEach((e) => {
				chanWin.push(e);
				chanGraph.nodes[e].solution = ww;
				chanGraph.nodes[e].type = "win";
				chanGraph.nodes[e].endNum = wordGraph.nodes[ww].endNum;
				chanGraph.removeOutEdge(e);
			});
		}

		if (chanWin.length === 0) break;
		chanGraph.removeOutEdge(chanWin);
		// 이긴 음절의 선수음절의 endNum 증가
		wordGraph.forEachPreds(chanWin, (node, pred) => {
			wordGraph.nodes[pred].endNum =
				(chanGraph.nodes[node].endNum as number) + 1;
		});
		// 이긴음절의 선수음절이 outdegree가 0인 것들을 찾아서 지는 음절 후보로 저장
		const wordLosCandidates = wordGraph.predecessors(chanWin);
		wordGraph.removeInEdge(chanWin);
		const wordLos = wordLosCandidates.filter(
			(e) => wordGraph.successors(e).length === 0
		);
		if (wordLos.length === 0) break;
		// 지는 음절들 재정의
		wordLos.forEach((e) => {
			wordGraph.nodes[e].type = "los";
		});
		const chanLosCandidates = chanGraph.predecessors(wordLos);
		chanGraph.forEachPreds(wordLos, (node, pred) => {
			chanGraph.nodes[pred].endNum = wordGraph.nodes[node].endNum;
		});
		chanGraph.removeInEdge(wordLos);
		chanLos = chanLosCandidates.filter(
			(e) => chanGraph.successors(e).length === 0
		);

		if (chanLos.length === 0) break;
		chanLos.forEach((e) => {
			chanGraph.nodes[e].type = "los";
		});
	}
	return;
}

export function sortByCondition(
	conditionStates: CustomConditionState[],
	nextWords: { word: Char[]; isLoop: boolean; moveNum?: number }[]
) {
	const priorityStates = conditionStates.filter(
		(e) => e.isValid && e.type === "priority"
	);
	if (priorityStates.length === 0) {
		return nextWords;
	}
	const containsMap: Record<string, { priority: number }> = {};
	const endswithMap: Record<string, { priority: number }> = {};
	const startswithMap: Record<string, { priority: number }> = {};
	priorityStates.forEach((e) => {
		if (e.conditionType === "contains") {
			containsMap[e.startChar + e.endChar] = {
				priority: e.priority,
			};
		} else if (e.conditionType === "endswith") {
			endswithMap[e.endChar] = {
				priority: e.priority,
			};
		} else if (e.conditionType === "startswith") {
			startswithMap[e.startChar] = {
				priority: e.priority,
			};
		}
	});
	const sortedWords = nextWords.sort((a, b) => {
		const a_condition = containsMap[a.word[0] + a.word[1]] ??
			endswithMap[a.word[1]] ??
			startswithMap[a.word[0]] ?? {
				priority: 0,
			};
		const b_condition = containsMap[b.word[0] + b.word[1]] ??
			endswithMap[b.word[1]] ??
			startswithMap[b.word[0]] ?? {
				priority: 0,
			};
		return a_condition.priority - b_condition.priority;
	});
	return sortedWords;
}
export function sortByConditionOnStrings(
	conditionStates: CustomConditionState[],
	nextWords: string[]
) {
	console.log("before sorting");
	console.log(nextWords);
	const priorityStates = conditionStates.filter(
		(e) => e.isValid && e.type === "priority"
	);
	if (priorityStates.length === 0) {
		console.log("after sorting");
		console.log(nextWords);
		return nextWords;
	}
	const containsMap: Record<string, number> = {};
	const endswithMap: Record<string, number> = {};
	const startswithMap: Record<string, number> = {};
	priorityStates.forEach((e) => {
		if (e.conditionType === "contains") {
			containsMap[e.startChar + e.endChar] = e.priority;
		} else if (e.conditionType === "endswith") {
			endswithMap[e.endChar] = e.priority;
		} else if (e.conditionType === "startswith") {
			startswithMap[e.startChar] = e.priority;
		}
	});
	const sortedWords = nextWords.sort((a, b) => {
		const a_condition = containsMap[a[0] + a[1]] ?? 0;
		const b_condition = containsMap[b[0] + b[1]] ?? 0;
		return a_condition - b_condition;
	});
	console.log("after sorting");
	console.log(sortedWords);
	return sortedWords;
}
export function getSingleChars(chanGraph: MultiDiGraph) {
	const chars = Object.keys(chanGraph.nodes).filter(
		(e) => !chanGraph.nodes[e].type
	);
	return chars.filter((char) => {
		const temp = chanGraph
			.predecessors(char)
			.map((pred) =>
				chanGraph.successors(pred).filter((e) => !chanGraph.nodes[e].type)
			)
			.sort();
		return temp.every((arr) => arraysEqual(arr, temp[0]));
	});
}

export function pruningWinLosCir(
	chanGraph: MultiDiGraph,
	wordGraph: MultiDiGraph
) {
	const pair: (head: string, tail: string) => undefined | [string, string] = (
		head: string,
		tail: string
	) => {
		for (let headPred of chanGraph.predecessors(head)) {
			for (let tailSucc of chanGraph.successors(tail)) {
				if (wordGraph.hasEdge(tailSucc, headPred)) {
					return [tailSucc, headPred];
				}
			}
		}
		return undefined;
	};
	//
	const chars = Object.keys(wordGraph.nodes).filter(
		(e) => !wordGraph.nodes[e].type
	);

	// const singleChars: Set<string> = new Set(getSingleChars(chanGraph));

	const returnWordGraph = new MultiDiGraph();

	for (let head of chars) {
		for (let tail of wordGraph.successors(head)) {
			if (returnWordGraph.hasEdge(head, tail)) {
				continue;
			}

			const returnPair = pair(head, tail);

			if (!returnPair) continue;
			if (returnWordGraph.hasEdge(returnPair[0], returnPair[1])) {
				continue;
			}
			const [pairHead, pairTail] = returnPair;
			//      래내 래1내 내이 이래
			const pairTailSucc = chanGraph
				.successors(pairTail)
				.filter((e) => wordGraph.successors(e).length > 0);
			const tailSucc = chanGraph
				.successors(tail)
				.filter((e) => wordGraph.successors(e).length > 0);

			if (
				!chanGraph
					.predecessors(head)
					.every((e) => pairTailSucc.every((ts) => chanGraph.hasEdge(e, ts)))
			)
				continue;
			if (
				!chanGraph
					.predecessors(pairHead)
					.every((e) => tailSucc.every((ts) => chanGraph.hasEdge(e, ts)))
			)
				continue;
			if (pairHead === head) {
				// 맴맴, 삐삐, 죽력죽
				const outdeg = wordGraph._succ[head][tail];
				const maximumEven = Math.floor(outdeg / 2) * 2;
				if (maximumEven > 0) {
					returnWordGraph.addEdge(head, tail, maximumEven);
				}
				if (outdeg % 2 === 1) {
					if (
						chanGraph
							.predecessors(head)
							.every((e) => chanGraph.successors(e).length === 1)
					) {
						wordGraph.nodes[head].loop = tail;
					}
				}
			}
			// 늠축 - 축보름
			else {
				const pairMin = Math.min(
					wordGraph._succ[head][tail],
					wordGraph._succ[pairHead][pairTail]
				);
				returnWordGraph.addEdge(head, tail, pairMin);
				returnWordGraph.addEdge(pairHead, pairTail, pairMin);
			}
		}
	}

	// this.wordGraph에서 제거

	for (let head in returnWordGraph.nodes) {
		for (let tail of returnWordGraph.successors(head)) {
			wordGraph.removeEdge(head, tail, returnWordGraph._succ[head][tail]);
		}
	}

	// loop 제거
	for (let head of chars) {
		if (wordGraph.nodes[head].loop) {
			wordGraph.removeEdge(head, wordGraph.nodes[head].loop as string);
		}
	}

	let wordSinks = chars.filter((e) => wordGraph.successors(e).length === 0);
	let wordWin = wordSinks.filter((e) => wordGraph.nodes[e].loop);
	let wordLos = wordSinks.filter((e) => !wordGraph.nodes[e].loop);

	wordWin.forEach((char) => {
		wordGraph.nodes[char].solution = wordGraph.nodes[char].loop;
		wordGraph.nodes[char].endNum =
			wordGraph.nodes[char].endNum === undefined
				? 1
				: (wordGraph.nodes[char].endNum as number) + 1;
		wordGraph.nodes[char].type = "wincir";
	});

	wordLos.forEach((char) => {
		wordGraph.nodes[char].endNum =
			wordGraph.nodes[char].endNum === undefined
				? 0
				: wordGraph.nodes[char].endNum;
		wordGraph.nodes[char].type = "loscir";
	});

	let chanWin: string[] = [];

	chanGraph.forEachPreds(wordWin, (node, pred) => {
		chanWin.push(pred);
		chanGraph.nodes[pred].endNum = wordGraph.nodes[node].endNum;
		chanGraph.nodes[pred].type = "wincir";
		chanGraph.nodes[pred].solution = node;
	});

	chanGraph.removeOutEdge(chanWin);

	chanGraph.forEachPreds(wordLos, (node, pred) => {
		chanGraph.nodes[pred].endNum = wordGraph.nodes[node].endNum as number;
	});
	chanGraph.removeInEdge(wordLos);

	let chanLos = Object.keys(chanGraph.nodes).filter(
		(e) => !chanGraph.nodes[e].type && chanGraph.successors(e).length === 0
	);

	chanLos.forEach((char) => {
		chanGraph.nodes[char].type = "loscir";
		if (chanGraph.nodes[char].endNum === undefined)
			chanGraph.nodes[char].endNum = 0;
	});

	while (chanLos.length > 0 || chanWin.length > 0) {
		let preds = wordGraph.predecessors(chanWin);
		wordGraph.forEachPreds(chanWin, (node, pred) => {
			wordGraph.nodes[pred].endNum =
				(chanGraph.nodes[node].endNum as number) + 1;
		});
		wordGraph.removeInEdge(chanWin);

		wordSinks = preds.filter((e) => wordGraph.successors(e).length === 0);
		wordLos = wordSinks.filter((e) => !wordGraph.nodes[e].loop);

		wordLos.forEach((char) => {
			wordGraph.nodes[char].type = "loscir";
		});

		const wordWinLoop = wordSinks.filter((e) => wordGraph.nodes[e].loop);
		wordWinLoop.forEach((e) => {
			wordGraph.nodes[e].endNum = (wordGraph.nodes[e].endNum as number) + 1;
			wordGraph.nodes[e].type = "wincir";
			wordGraph.nodes[e].solution = wordGraph.nodes[e].loop;
		});
		const wordWinNoLoop = [];
		for (let char of chanLos) {
			const preds = wordGraph.predecessors(char);
			preds.forEach((pred) => {
				wordGraph.nodes[pred].endNum =
					(chanGraph.nodes[char].endNum as number) + 1;
				wordGraph.nodes[pred].type = "wincir";
				wordGraph.nodes[pred].solution = char;
			});
			wordGraph.removeOutEdge(preds);
			wordWinNoLoop.push(...preds);
		}
		wordWin = [...wordWinLoop, ...wordWinNoLoop];

		chanWin = [];
		chanGraph.forEachPreds(wordWin, (node, pred) => {
			chanWin.push(pred);
			chanGraph.nodes[pred].endNum = wordGraph.nodes[node].endNum;
			chanGraph.nodes[pred].type = "wincir";
			chanGraph.nodes[pred].solution = node;
		});

		chanGraph.removeOutEdge(chanWin);

		preds = chanGraph.predecessors(wordLos);
		chanGraph.forEachPreds(wordLos, (node, pred) => {
			chanGraph.nodes[pred].endNum = wordGraph.nodes[node].endNum;
		});
		chanGraph.removeInEdge(wordLos);
		chanLos = preds.filter((e) => chanGraph.successors(e).length === 0);

		chanLos.forEach((e) => {
			chanGraph.nodes[e].type = "loscir";
		});
	}
	for (let char in chanGraph.nodes) {
		if (!chanGraph.nodes[char].type) {
			chanGraph.nodes[char].type = "route";
		}
	}
	for (let char in wordGraph.nodes) {
		if (!wordGraph.nodes[char].type) {
			wordGraph.nodes[char].type = "route";
		}
	}
	return returnWordGraph;
}

export function getSCC(
	chanGraph: MultiDiGraph,
	wordGraph: MultiDiGraph,
	seeds: string[]
) {
	let id = 0;
	const seedSet = new Set(seeds);
	const d: Record<Char, number> = arrayToKeyMap(seeds, () => 0);

	const finished: Record<Char, boolean> = arrayToKeyMap(seeds, () => false);

	const SCC: Char[][] = [];
	const stack: Char[] = [];

	const dfs: (x: Char) => number = (x: Char) => {
		d[x] = ++id;
		stack.push(x);

		let parent = d[x];
		const succ = [
			...new Set(
				(chanGraph.nodes[x] ? chanGraph.successors(x) : []).concat(
					chanGraph.nodes[x] ? wordGraph.successors(x) : []
				)
			),
		].filter((e) => seedSet.has(e));
		for (let i = 0; i < succ.length; i++) {
			const next = succ[i];

			if (d[next] === 0) parent = Math.min(parent, dfs(next));
			else if (!finished[next]) parent = Math.min(parent, d[next]);
		}

		if (parent === d[x]) {
			const scc: Char[] = [];
			while (1) {
				const t = stack.pop()!;
				scc.push(t);
				finished[t] = true;
				if (t === x) break;
			}

			SCC.push(scc);
		}

		return parent;
	};

	for (let char of seeds) {
		if (d[char] === 0) {
			dfs(char);
		}
	}

	return SCC;
}

export function getMaxMinComponents(
	chanGraph: MultiDiGraph,
	wordGraph: MultiDiGraph,
	seeds: string[]
) {
	const scc = getSCC(chanGraph, wordGraph, seeds);
	const maxComp = scc.filter((e) => e.length >= 3).flat();
	const minComp = scc.filter((e) => e.length < 3).flat();

	return [maxComp, minComp];
}

export function getReachableNodes(
	chanGraph: MultiDiGraph,
	wordGraph: MultiDiGraph,
	char: string
) {
	const chanVisited: Set<string> = new Set();
	const wordVisited: Set<string> = new Set();

	const dfs = (char: string) => {
		chanVisited.add(char);
		const nextWords = chanGraph.successors(char);
		nextWords.forEach((char) => wordVisited.add(char));

		const nextChans = nextWords
			.flatMap((e) => [
				...wordGraph.successors(e),
				...(wordGraph.nodes[e].loop ? [wordGraph.nodes[e].loop as string] : []),
			])
			.filter((e) => !chanVisited.has(e));

		for (let next of nextChans) {
			dfs(next);
		}
	};

	dfs(char);

	return new Set([...chanVisited, ...wordVisited]);
}
export function getNextRouteChars(
	chanGraph: MultiDiGraph,
	wordGraph: MultiDiGraph,
	withMoveNum?: boolean
) {
	const routeChars = Object.keys(chanGraph.nodes).filter(
		(e) => chanGraph.nodes[e].type === "route"
	);

	const nextRouteChars: {
		char: Char;
		moveNum?: number;
	}[] = [];
	for (const char of routeChars) {
		const nextCharInfo: { char: Char; moveNum?: number } = {
			char: char,
			...(withMoveNum
				? { moveNum: getNextWords(chanGraph, wordGraph, char).length }
				: {}),
		};
		nextRouteChars.push(nextCharInfo);
	}

	return nextRouteChars;
}
export function getNextWords(
	chanGraph: MultiDiGraph,
	wordGraph: MultiDiGraph,
	currChar: Char,
	withMoveNum?: boolean
) {
	const chanSucc = chanGraph.successors(currChar);
	const nextWords: {
		word: Char[];
		isLoop: boolean;
		moveNum?: number;
	}[] = [];

	for (let chan of chanSucc) {
		for (let word of wordGraph.successors(chan)) {
			const nextWordInfo: {
				word: Char[];
				isLoop: boolean;
				moveNum?: number;
			} = {
				word: [chan, word],
				isLoop: false,
			};

			if (withMoveNum) {
				nextWordInfo.moveNum = getNextWords(chanGraph, wordGraph, word).length;
			}
			nextWords.push(nextWordInfo);
		}
		if (wordGraph.nodes[chan].loop) {
			const nextWordInfo: {
				word: Char[];
				isLoop: boolean;
				moveNum?: number;
			} = {
				word: [chan, wordGraph.nodes[chan].loop as Char],
				isLoop: true,
			};
			if (withMoveNum) {
				nextWordInfo.moveNum = getNextWords(
					chanGraph,
					wordGraph,
					wordGraph.nodes[chan].loop as string
				).length;
			}
			nextWords.push(nextWordInfo);
		}
	}

	return nextWords;
}
let testcount = 0;
export function isWin(
	namedRule: string,
	chanGraph: MultiDiGraph,
	wordGraph: MultiDiGraph,
	currChar: Char,
	customConditionEngine: CustomConditionEngine = new CustomConditionEngine([]),
	pushCallback?: (head?: Char, tail?: Char) => void,
	popCallback?: (win: boolean) => void,
	customPriority?: Record<string, number>
) {
	const conditions = customConditionEngine?.getValidConditions();

	if (
		conditions &&
		conditions.filter((e) => e.type === "win" && e.isSelected && e.isValid)
			.length > 0
	) {
		console.log("win");
		return false;
	} else if (
		conditions &&
		conditions.filter((e) => e.type === "los" && e.isSelected && e.isValid)
			.length > 0
	) {
		console.log("los");
		return true;
	}

	if (
		chanGraph.nodes[currChar].type === "win" ||
		chanGraph.nodes[currChar].type === "wincir"
	) {
		return true;
	}
	if (
		chanGraph.nodes[currChar].type === "los" ||
		chanGraph.nodes[currChar].type === "loscir"
	) {
		return false;
	}

	const nextWords = getNextWords(chanGraph, wordGraph, currChar, true);
	//추가 소팅 2회
	if (nextWords.find((e) => e.word[0] === "준" && e.word[1] === "택")) {
		console.log("before sorting");
		console.log(nextWords.map((e) => e.word));
	}
	nextWords.sort((a, b) => nextWordSortKey(a, b, namedRule));
	if (customPriority) {
		nextWords.sort((a, b) => {
			const aPriority = customPriority?.[a.word[0] + a.word[1]];
			const bPriority = customPriority?.[b.word[0] + b.word[1]];
			return (
				(aPriority !== undefined ? aPriority : 0) -
				(bPriority !== undefined ? bPriority : 0)
			);
		});
	}
	if (nextWords.find((e) => e.word[0] === "준" && e.word[1] === "택")) {
		console.log("after sorting");
		console.log(nextWords.map((e) => e.word));
	}
	const sortedNextWords = sortByCondition(conditions, nextWords);

	// if (sortedNextWords.find((e) => e.word[0] === "준" && e.word[1] === "택")) {
	// 	console.log("final sorting");
	// 	console.log(sortedNextWords.map((e) => e.word));
	// }
	for (let { word, isLoop } of sortedNextWords) {
		const nextCustomConditionEngine = customConditionEngine?.copy();
		const nextChanGraph = chanGraph.copy();
		const nextWordGraph = wordGraph.copy();

		if (pushCallback) {
			pushCallback(word[0], word[1]);
		}
		if (isLoop) {
			nextWordGraph.nodes[word[0]].loop = undefined;
		} else {
			nextWordGraph.removeEdge(word[0], word[1], 1);
		}
		nextWordGraph.clearNodeInfo();
		nextChanGraph.clearNodeInfo();
		pruningWinLos(nextChanGraph, nextWordGraph);
		pruningWinLosCir(nextChanGraph, nextWordGraph);
		nextCustomConditionEngine.updateState(word[0] + word[1]);
		const win = isWin(
			namedRule,
			nextChanGraph,
			nextWordGraph,
			word[1],
			nextCustomConditionEngine,
			// customConditionEngine,
			pushCallback,
			popCallback,
			customPriority
		);
		if (popCallback) {
			popCallback(!win);
		}
		if (!win) {
			return true;
		}
	}

	return false;
}

export function iterativeDeepeningSearch(
	chanGraph: MultiDiGraph,
	wordGraph: MultiDiGraph,
	currChar: Char,
	callback?: (action: string, data?: any) => void
) {
	let depth = 1;

	while (1) {
		if (callback) callback("newDepth", depth);
		const result = depthLimitedSearch(
			chanGraph,
			wordGraph,
			currChar,
			depth,
			callback
		);

		if (result !== "cutoff") {
			return result;
		} else {
			if (callback) callback("cutoff");
		}
		depth++;
	}
}

function depthLimitedSearch(
	chanGraph: MultiDiGraph,
	wordGraph: MultiDiGraph,
	currChar: Char,
	depth: number,
	callback?: (action: string, data?: any) => void
) {
	if (
		chanGraph.nodes[currChar].type === "win" ||
		chanGraph.nodes[currChar].type === "wincir"
	) {
		return true;
	}
	if (
		chanGraph.nodes[currChar].type === "los" ||
		chanGraph.nodes[currChar].type === "loscir"
	) {
		return false;
	}
	if (depth === 0) {
		return "cutoff";
	}

	const nextWords = getNextWords(chanGraph, wordGraph, currChar, true);

	nextWords.sort((a, b) => {
		return a.moveNum! - b.moveNum!;
	});

	let isChildCutoff = false;

	for (let { word, isLoop } of nextWords) {
		if (callback) {
			callback("push", word);
		}
		const nextChanGraph = chanGraph.copy();
		const nextWordGraph = wordGraph.copy();

		if (isLoop) {
			nextWordGraph.nodes[word[0]].loop = undefined;
		} else {
			nextWordGraph.removeEdge(word[0], word[1], 1);
		}
		nextWordGraph.clearNodeInfo();
		nextChanGraph.clearNodeInfo();
		pruningWinLos(nextChanGraph, nextWordGraph);
		pruningWinLosCir(nextChanGraph, nextWordGraph);

		const win = depthLimitedSearch(
			nextChanGraph,
			nextWordGraph,
			word[1],
			depth - 1,
			callback
		);

		if (callback) {
			callback("pop", !win);
		}
		if (win === false) {
			return true;
		}
		if (win === "cutoff") {
			isChildCutoff = true;
		}
	}

	if (isChildCutoff) {
		return "cutoff";
	} else {
		return false;
	}
}
export function nextWordSortKey(
	a: {
		word: Char[];
		isLoop: boolean;
		moveNum?: number;
	},
	b: {
		word: Char[];
		isLoop: boolean;
		moveNum?: number;
	},
	namedRule: string,
	customPriority?: Record<string, number>
) {
	let a_key, b_key;

	if (namedRule === "guel") {
		if (guelPrecedenceMap[a.word[0]]?.[a.word[1]]) {
			a_key = -guelPrecedenceMap[a.word[0]]?.[a.word[1]];
		} else {
			a_key = a.moveNum;
		}
		if (guelPrecedenceMap[b.word[0]]?.[b.word[1]]) {
			b_key = -guelPrecedenceMap[b.word[0]]?.[b.word[1]];
		} else {
			b_key = b.moveNum;
		}
	} else if (precedenceMap[namedRule]) {
		const prec = precedenceMap[namedRule];
		if (prec[a.word[1]]) {
			a_key = -prec[a.word[1]];
		} else {
			a_key = a.moveNum;
		}
		if (prec[b.word[1]]) {
			b_key = -prec[b.word[1]];
		} else {
			b_key = b.moveNum;
		}
	} else {
		a_key = a.moveNum;
		b_key = b.moveNum;
	}
	if (customPriority) {
		a_key = customPriority[a.word[0]] ? customPriority[a.word[0]] : a_key;
		b_key = customPriority[b.word[0]] ? customPriority[b.word[0]] : b_key;
	}
	return a_key! - b_key!;
}
export function nextRouteCharSortKey(
	a: {
		char: Char;

		moveNum?: number;
	},
	b: {
		char: Char;

		moveNum?: number;
	},
	namedRule: string
) {
	let a_key, b_key;

	if (precedenceMap[namedRule]) {
		const prec = precedenceMap[namedRule];
		if (prec[a.char]) {
			a_key = -prec[a.char];
		} else {
			a_key = a.moveNum;
		}
		if (prec[b.char]) {
			b_key = -prec[b.char];
		} else {
			b_key = b.moveNum;
		}
	} else {
		a_key = a.moveNum;
		b_key = b.moveNum;
	}
	return a_key! - b_key!;
}
