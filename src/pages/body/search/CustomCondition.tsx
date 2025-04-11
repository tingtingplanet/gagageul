import { AiOutlineClose, AiOutlinePlus } from "react-icons/ai";
import { useState, useEffect } from "react";
import { useWC } from "@/lib/store/useWC";
import { CustomCondition } from "@/lib/wc/WordChain";

// Define a condition item interface
interface ConditionItem extends CustomCondition {
	id: string;
	errors: string[];
}

// WordCount pair interface
interface WordCountPair {
	id: string;
	word: string;
	count: number;
}

// Create a simpler default condition
const createDefaultCondition = (): Omit<ConditionItem, "id" | "errors"> => ({
	exceptWords: {},
	includeWords: {},
	startChar: "",
	endChar: "",
	conditionType: "endswith",
	type: "win",
	priority: 0,
});

// Validate condition
function validateCondition(
	condition: Omit<ConditionItem, "id" | "errors">
): string[] {
	const errors: string[] = [];

	if (
		condition.conditionType === "contains" &&
		(!condition.startChar || !condition.endChar)
	) {
		errors.push("포함 조건에는 시작 문자와 끝 문자가 모두 필요합니다");
	}

	if (condition.conditionType === "startswith" && !condition.startChar) {
		errors.push("시작 조건에는 시작 문자가 필요합니다");
	}

	if (condition.conditionType === "endswith" && !condition.endChar) {
		errors.push("끝 조건에는 끝 문자가 필요합니다");
	}
	if (!Object.keys(condition.exceptWords).every((word) => word.length === 2)) {
		errors.push("제외할 단어는 각각 두글자 이어야합니다");
	}
	if (!Object.keys(condition.includeWords).every((word) => word.length === 2)) {
		errors.push("포함할 단어는 각각 두글자 이어야합니다");
	}
	return errors;
}

// Word-Count Pair Component
function WordCountPairInput({
	pairs,
	setPairs,
	label,
	placeholder,
}: {
	pairs: WordCountPair[];
	setPairs: (pairs: WordCountPair[]) => void;
	label: string;
	placeholder: string;
}) {
	const addPair = () => {
		setPairs([...pairs, { id: crypto.randomUUID(), word: "", count: 1 }]);
	};

	const removePair = (id: string) => {
		setPairs(pairs.filter((pair) => pair.id !== id));
	};

	const updatePair = (id: string, updates: Partial<WordCountPair>) => {
		setPairs(
			pairs.map((pair) => (pair.id === id ? { ...pair, ...updates } : pair))
		);
	};

	return (
		<div>
			<label className=" text-sm font-medium text-gray-700 mb-1">{label}</label>

			{pairs.length === 0 && (
				<div className="text-sm text-gray-500 mb-2">아직 항목이 없습니다.</div>
			)}

			{pairs.map((pair) => (
				<div key={pair.id} className="flex items-center space-x-2 mb-2">
					<input
						type="text"
						value={pair.word}
						maxLength={2}
						onChange={(e) => updatePair(pair.id, { word: e.target.value })}
						className="flex-1 border rounded px-3 py-2"
						placeholder={placeholder}
					/>
					<span className="text-gray-500">:</span>
					<input
						type="number"
						value={pair.count}
						onChange={(e) => {
							const value = parseInt(e.target.value);
							updatePair(pair.id, { count: isNaN(value) ? 1 : value });
						}}
						className="w-20 border rounded px-3 py-2"
					/>
					<button
						onClick={() => removePair(pair.id)}
						className="text-gray-500 hover:text-red-600"
						aria-label="Remove pair"
					>
						<AiOutlineClose />
					</button>
				</div>
			))}

			<button
				onClick={addPair}
				className="flex items-center text-blue-500 hover:text-blue-700 text-sm"
			>
				<AiOutlinePlus className="mr-1" /> 새 항목 추가
			</button>
		</div>
	);
}

export default function CustomConditionPage() {
	const [conditions, setConditions] = useState<ConditionItem[]>([]);
	const [customConditions, setCustomConditions] = useWC((state) => [
		state.customConditions,
		state.setCustomConditions,
	]);

	// Word-count pairs for each condition
	const [exceptPairs, setExceptPairs] = useState<
		Record<string, WordCountPair[]>
	>({});
	const [includePairs, setIncludePairs] = useState<
		Record<string, WordCountPair[]>
	>({});

	// Load existing conditions on mount
	useEffect(() => {
		if (customConditions.length > 0) {
			const initialConditions = customConditions.map((condition) => ({
				id: crypto.randomUUID(),
				...condition,
				errors: [],
			}));

			setConditions(initialConditions);

			// Initialize pairs from existing conditions
			const newExceptPairs: Record<string, WordCountPair[]> = {};
			const newIncludePairs: Record<string, WordCountPair[]> = {};

			initialConditions.forEach((condition) => {
				newExceptPairs[condition.id] = Object.entries(
					condition.exceptWords
				).map(([word, count]) => ({
					id: crypto.randomUUID(),
					word,
					count,
				}));

				newIncludePairs[condition.id] = Object.entries(
					condition.includeWords
				).map(([word, count]) => ({
					id: crypto.randomUUID(),
					word,
					count,
				}));
			});

			setExceptPairs(newExceptPairs);
			setIncludePairs(newIncludePairs);
		}
	}, []);

	// Update a condition's exceptWords and includeWords when pairs change
	useEffect(() => {
		if (Object.keys(exceptPairs).length === 0) return;

		setConditions((prevConditions) =>
			prevConditions.map((condition) => {
				const conditionExceptPairs = exceptPairs[condition.id] || [];
				const conditionIncludePairs = includePairs[condition.id] || [];

				const exceptWords = conditionExceptPairs.reduce((acc, pair) => {
					if (pair.word.trim()) {
						acc[pair.word] = pair.count;
					}
					return acc;
				}, {} as Record<string, number>);

				const includeWords = conditionIncludePairs.reduce((acc, pair) => {
					if (pair.word.trim()) {
						acc[pair.word] = pair.count;
					}
					return acc;
				}, {} as Record<string, number>);

				const updated = {
					...condition,
					exceptWords,
					includeWords,
				};

				const { id: _, errors: __, ...conditionWithoutIdErrors } = updated;
				const errors = validateCondition(conditionWithoutIdErrors);

				return { ...updated, errors };
			})
		);
	}, [exceptPairs, includePairs]);

	// Update customConditions whenever conditions change
	useEffect(() => {
		const validConditions = conditions.filter(
			(condition) => condition.errors.length === 0
		);
		const formattedConditions: CustomCondition[] = validConditions.map(
			({ id, errors, ...condition }) => condition
		);
		setCustomConditions(formattedConditions);
		console.log(customConditions);
	}, [conditions, setCustomConditions]);

	// Add a new condition
	const addCondition = () => {
		const defaultCondition = createDefaultCondition();
		const id = crypto.randomUUID();

		const newCondition: ConditionItem = {
			id,
			...defaultCondition,
			errors: validateCondition(defaultCondition),
		};

		setConditions((prev) => [...prev, newCondition]);
		setExceptPairs((prev) => ({ ...prev, [id]: [] }));
		setIncludePairs((prev) => ({ ...prev, [id]: [] }));
	};

	// Remove a condition
	const removeCondition = (id: string) => {
		setConditions((prev) => prev.filter((condition) => condition.id !== id));

		setExceptPairs((prev) => {
			const newPairs = { ...prev };
			delete newPairs[id];
			return newPairs;
		});

		setIncludePairs((prev) => {
			const newPairs = { ...prev };
			delete newPairs[id];
			return newPairs;
		});
	};

	// Update a condition
	const updateCondition = (
		id: string,
		updates: Partial<Omit<ConditionItem, "id" | "errors">>
	) => {
		setConditions((prev) =>
			prev.map((condition) => {
				if (condition.id !== id) return condition;

				const updated = {
					...condition,
					...updates,
				} as ConditionItem;

				const { id: _, errors: __, ...conditionWithoutIdErrors } = updated;
				const errors = validateCondition(conditionWithoutIdErrors);

				return { ...updated, errors };
			})
		);
	};

	return (
		<div className="p-6 space-y-6 max-w-3xl mx-auto">
			<h1 className="text-xl font-bold">커스텀 조건 설정</h1>

			{conditions.length === 0 && (
				<div className="text-center text-gray-500 py-4">
					<p>아직 조건이 없습니다. 새 조건을 추가해 보세요.</p>
				</div>
			)}

			{conditions.map((condition) => (
				<div
					key={condition.id}
					className="relative bg-white border rounded-lg shadow-sm p-4 space-y-4"
				>
					<div className="flex justify-end">
						<button
							onClick={() => removeCondition(condition.id)}
							className="text-gray-500 hover:text-red-600"
							aria-label="Remove condition"
						>
							<AiOutlineClose />
						</button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								조건 타입
							</label>
							<select
								value={condition.conditionType}
								onChange={(e) =>
									updateCondition(condition.id, {
										conditionType: e.target.value as
											| "endswith"
											| "startswith"
											| "contains",
									})
								}
								className="w-full border rounded px-3 py-2"
							>
								<option value="endswith">끝나는 문자로</option>
								<option value="startswith">시작하는 문자로</option>
								<option value="contains">포함된 문자로</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								승패 타입
							</label>
							<select
								value={condition.type}
								onChange={(e) =>
									updateCondition(condition.id, {
										type: e.target.value as "win" | "los" | "priority",
									})
								}
								className="w-full border rounded px-3 py-2"
							>
								<option value="win">승리</option>
								<option value="los">패배</option>
								<option value="priority">우선순위</option>
							</select>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{(condition.conditionType === "startswith" ||
							condition.conditionType === "contains") && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									시작 문자
								</label>
								<input
									type="text"
									maxLength={1}
									value={condition.startChar}
									onChange={(e) =>
										updateCondition(condition.id, { startChar: e.target.value })
									}
									className="w-full border rounded px-3 py-2"
									placeholder="시작 문자 (한 글자)"
								/>
							</div>
						)}

						{(condition.conditionType === "endswith" ||
							condition.conditionType === "contains") && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									끝 문자
								</label>
								<input
									type="text"
									maxLength={1}
									value={condition.endChar}
									onChange={(e) =>
										updateCondition(condition.id, { endChar: e.target.value })
									}
									className="w-full border rounded px-3 py-2"
									placeholder="끝 문자 (한 글자)"
								/>
							</div>
						)}
					</div>

					{condition.type === "priority" && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								우선순위
							</label>
							<input
								type="number"
								value={condition.priority}
								onChange={(e) =>
									updateCondition(condition.id, {
										priority: parseInt(e.target.value),
									})
								}
								className="w-full border rounded px-3 py-2"
							/>
						</div>
					)}

					<div className="grid grid-cols-1 gap-6">
						<WordCountPairInput
							pairs={exceptPairs[condition.id] || []}
							setPairs={(pairs) =>
								setExceptPairs((prev) => ({ ...prev, [condition.id]: pairs }))
							}
							label="남은 단어가 ~개 이하일때"
							placeholder="단어 입력"
						/>

						<WordCountPairInput
							pairs={includePairs[condition.id] || []}
							setPairs={(pairs) =>
								setIncludePairs((prev) => ({ ...prev, [condition.id]: pairs }))
							}
							label="남은 단어가 ~개 이상일때"
							placeholder="단어 입력"
						/>
					</div>

					{condition.errors.length > 0 && (
						<div className="bg-red-50 border border-red-200 rounded p-2">
							{condition.errors.map((error, index) => (
								<p key={index} className="text-sm text-red-600">
									⚠️ {error}
								</p>
							))}
						</div>
					)}
				</div>
			))}

			<button
				onClick={addCondition}
				className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
			>
				➕ 새 조건 추가
			</button>
		</div>
	);
}
