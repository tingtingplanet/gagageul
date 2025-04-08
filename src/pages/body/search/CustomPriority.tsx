import { AiOutlineClose } from "react-icons/ai";
import { useState, useEffect } from "react";
import { useWC } from "@/lib/store/useWC";

interface WordItem {
	id: string;
	prefix: string;
	input: string;
	result: Record<string, number> | string;
}

function resultToString(result: Record<string, number> | string) {
	if (typeof result === "string") return result;
	return Object.entries(result)
		.map(([key, val]) => `${key.at(-1)}:${val}`)
		.join(" ");
}

function priorityToCards(customPriority: Record<string, number>) {
	const cards: WordItem[] = [];
	Object.entries(customPriority).forEach(([key, val]) => {
		const existingCard = cards.find((card) => card.prefix === key[0]);
		if (existingCard) {
			const modifiedCard = { ...existingCard };
			modifiedCard.result = {
				...(existingCard.result as Record<string, number>),
				[key]: Number(val),
			};
			modifiedCard.input = resultToString(modifiedCard.result);
			cards.splice(cards.indexOf(existingCard), 1);
			cards.push(modifiedCard);
		} else {
			cards.push({
				id: crypto.randomUUID(),
				prefix: key[0],
				input: resultToString({ [key]: val }),
				result: {
					[key]: Number(val),
				},
			});
		}
	});
	return cards;
}

function cardsToPriority(cards: WordItem[]) {
	const priority: Record<string, number> = {};
	cards.forEach((card) => {
		if (typeof card.result === "object") {
			Object.entries(card.result).forEach(([key, val]) => {
				priority[key] = Number(val);
			});
		}
	});
	return priority;
}

const check_Is_Valid_Input = (input: string) => {
	const inputCopy = input;
	const result = inputCopy.split(" ").every((chunk) => {
		const [key, val] = chunk.split(":").map((s) => s.trim());
		return key && !isNaN(Number(val)) && val !== "";
	});
	return result;
};
const parseInput = (
	prefix: string,
	input: string
): Record<string, number> | string => {
	input = input.trim();
	// check input is valid
	if (!input) return "접미어를 입력해주세요";
	if (prefix.length !== 1) return "접두어는 한 글자만 입력해주세요";
	if (!check_Is_Valid_Input(input)) return "접미어는 숫자만 입력해주세요";
	const entries = input
		.split(" ")
		.map((chunk) => chunk.split(":").map((s) => s.trim()))
		.filter(([key, val]) => key && !isNaN(Number(val)));
	const record: Record<string, number> = {};
	for (const [key, val] of entries) {
		if (key.length !== 1) return "접두어는 한 글자만 입력해주세요";
		if (record[prefix + key] !== undefined) {
			return "복된 우선순위가 있습니다";
		}
		record[prefix + key] = Number(val);
	}
	return record;
};

export default function CustomPriority() {
	const [cards, setCards] = useState<WordItem[]>([]);
	const [customPriority, setCustomPriority, searchInputValue] = useWC(
		(state) => [
			state.customPriority,
			state.setCustomPriority,
			state.searchInputValue,
		]
	);
	useEffect(() => {
		if (customPriority === null) return;
		setCards(
			priorityToCards(customPriority).sort((a, b) => {
				const aPriority = a.prefix === searchInputValue ? 0 : 1;
				const bPriority = b.prefix === searchInputValue ? 0 : 1;
				return aPriority - bPriority;
			})
		);
	}, []);
	useEffect(() => {
		setCustomPriority(cardsToPriority(cards));
	}, [cards]);
	const addCard = () => {
		const newCard: WordItem = {
			id: crypto.randomUUID(),
			prefix: "",
			input: "",
			result: {},
		};
		setCards((prev) => [...prev, newCard]);
	};

	const removeCard = (id: string) => {
		setCards((prev) => prev.filter((card) => card.id !== id));
	};

	const updateCard = (id: string, updated: Partial<WordItem>) => {
		//duplicated prefix check
		const prefix =
			updated.prefix === undefined
				? cards.find((card) => card.id === id)?.prefix
				: updated.prefix;
		const isDuplicated = cards.some(
			(card) => card.id !== id && card.prefix === prefix
		);
		if (isDuplicated) {
		}
		const newCards: WordItem[] = cards.map((card) =>
			card.id === id
				? {
						...card,
						...updated,
						result: isDuplicated
							? "중복된 접두어가 있습니다"
							: (updated.result as Record<string, number> | string),
				  }
				: card
		);
		setCards(newCards);
		return;
	};

	return (
		<div className="p-6 space-y-4 max-w-2xl mx-auto">
			<h1 className="text-xl font-bold">탐색 우선순위 입력</h1>

			{cards.map((card) => (
				<div key={card.id} className="relative bg-white border rounded shadow">
					<div className="flex justify-end pr-1 py-1">
						<button
							onClick={() => removeCard(card.id)}
							className=" text-black-500 hover:text-red-700 text-xs bg-gray-200 rounded-full w-4 h-4 text-center items-center justify-center justify-items-center"
						>
							<AiOutlineClose />
						</button>
					</div>
					<div className="flex space-x-2 px-4">
						<input
							type="text"
							placeholder="접두어"
							maxLength={1}
							value={card.prefix}
							onChange={(e) =>
								updateCard(card.id, {
									prefix: e.target.value,
									result: parseInput(e.target.value, card.input),
								})
							}
							className="w-1/3 px-3 py-2 border rounded"
						/>
						<input
							type="text"
							placeholder="접미어 : 숫자"
							value={card.input}
							onChange={(e) =>
								updateCard(card.id, {
									input: e.target.value,
									result: parseInput(card.prefix, e.target.value),
								})
							}
							className="flex-1 px-3 py-2 border rounded"
						/>
					</div>

					<div className="mt-2 text-sm text-gray-600">
						{typeof card.result === "string" ? (
							<div className="flex justify-between bg-gray-50 px-3 py-1 rounded mb-1 text-red-500">
								<span>{card.result}</span>
							</div>
						) : (
							Object.entries(card.result).map(([key, val]) => (
								<div
									key={key}
									className="flex justify-between bg-gray-50 px-3 py-1 rounded mb-1"
								>
									<span>{key}</span>
									<span>{val}</span>
								</div>
							))
						)}
					</div>
				</div>
			))}

			<button
				onClick={addCard}
				className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
			>
				➕ 카드 추가
			</button>
		</div>
	);
}
