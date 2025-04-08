import { useWC } from "@/lib/store/useWC";
import React, { useEffect, useState } from "react";
import { CustomCondition } from "@/lib/store/useWC";
function is_Valid_Input(input: string) {
	const inputCopy = input;
	if (inputCopy.length === 0) return false;
	const result = inputCopy
		.trim()
		.split(/\s+/)
		.every((chunk) => {
			if (chunk.length !== 2) return false;
			return true;
		});
	return result;
}

function is_Valid_Condition(condition: CustomCondition) {
	if (
		condition.exceptWords.length === 0 ||
		condition.includeWords.length === 0
	) {
		return false;
	}
	if (!condition.exceptWords.every((word) => word.length === 2)) {
		return false;
	}
	if (!condition.includeWords.every((word) => word.length === 2)) {
		return false;
	}
	if (
		condition.priority.startChar.length !== 1 ||
		condition.priority.endChar.length !== 1
	) {
		return false;
	}
	return true;
}

export default function CustomConditionPage() {
	// 단 하나의 조건만 관리
	const [customCondition, setCustomCondition] = useWC((e) => [
		e.customCondition,
		e.setCustomCondition,
	]);
	const [cliCC, setCliCC] = useState<CustomCondition>({
		exceptWords: [],
		includeWords: [],
		priority: {
			startChar: "",
			endChar: "",
			priority: 0,
		},
	});
	const [exceptWordString, setExceptWordString] = useState("");
	const [includeWordString, setIncludeWordString] = useState("");

	const [inclusionError, setInclusionError] =
		useState<string>("유효하지 않은 입력입니다.");
	const [exclusionError, setExclusionError] =
		useState<string>("유효하지 않은 입력입니다.");
	const [startCharError, setStartCharError] =
		useState<string>("유효하지 않은 입력입니다.");
	const [endCharError, setEndCharError] =
		useState<string>("유효하지 않은 입력입니다.");
	useEffect(() => {
		if (customCondition === null) return;
		setCliCC(customCondition);
		setExceptWordString(customCondition.exceptWords.join(" "));
		setIncludeWordString(customCondition.includeWords.join(" "));
		if (
			!customCondition.includeWords.every((word) => word.length === 2) ||
			customCondition.includeWords.length === 0
		) {
			setInclusionError("유효하지 않은 입력입니다.");
		} else {
			setInclusionError("");
		}
		if (
			!customCondition.exceptWords.every((word) => word.length === 2) ||
			customCondition.exceptWords.length === 0
		) {
			setExclusionError("유효하지 않은 입력입니다.");
		} else {
			setExclusionError("");
		}
		if (customCondition.priority.startChar.length !== 1) {
			setStartCharError("유효하지 않은 입력입니다.");
		} else {
			setStartCharError("");
		}
		if (customCondition.priority.endChar.length !== 1) {
			setEndCharError("유효하지 않은 입력입니다.");
		} else {
			setEndCharError("");
		}
	}, [setCliCC]);
	useEffect(() => {
		if (is_Valid_Condition(cliCC)) {
			setCustomCondition(cliCC);
		} else {
			setCustomCondition(null);
		}
	}, [cliCC]);
	return (
		<div className="p-6 space-y-4 max-w-md mx-auto">
			<h1 className="text-xl font-bold mb-4">조건 입력 (Custom Condition)</h1>

			{/* 단 하나의 카드 형태 */}
			<div className="bg-white border rounded shadow p-4">
				<div className="grid grid-cols-2 gap-4">
					{/* 포함되는 두 글자 */}
					<div>
						<label className="block text-sm font-medium mb-1">포함(~~)</label>
						<input
							type="text"
							value={includeWordString}
							onChange={(e) => {
								setIncludeWordString(e.target.value);
								if (!is_Valid_Input(e.target.value)) {
									setCliCC({
										...cliCC,
										includeWords: [],
									});
									setInclusionError("유효하지 않은 입력입니다.");
								} else {
									setCliCC({
										...cliCC,
										includeWords: e.target.value.trim().split("/s+/"),
									});
									setInclusionError("");
								}
							}}
							className="w-full px-3 py-2 border rounded focus:outline-none"
							placeholder="예: 사과"
						/>
						{inclusionError !== "" && (
							<p className="text-red-500 text-sm mt-1">{inclusionError}</p>
						)}
					</div>

					{/* 제외되는 두 글자 */}
					<div>
						<label className="block text-sm font-medium mb-1">제외(~~)</label>
						<input
							type="text"
							value={exceptWordString}
							onChange={(e) => {
								setExceptWordString(e.target.value);
								if (!is_Valid_Input(e.target.value)) {
									setCliCC({
										...cliCC,
										exceptWords: [],
									});
									setExclusionError("유효하지 않은 입력입니다.");
								} else {
									setCliCC({
										...cliCC,
										exceptWords: e.target.value.trim().split("/s+/"),
									});
									setExclusionError("");
								}
							}}
							className="w-full px-3 py-2 border rounded focus:outline-none"
							placeholder="예: 귀신"
						/>
						{exclusionError !== "" && (
							<p className="text-red-500 text-sm mt-1">{exclusionError}</p>
						)}
					</div>

					{/* 시작 문자(1글자) */}
					<div>
						<label className="block text-sm font-medium mb-1">시작(~)</label>
						<input
							type="text"
							maxLength={1}
							value={cliCC.priority.startChar}
							onChange={(e) => {
								setCliCC({
									...cliCC,
									priority: {
										...cliCC.priority,
										startChar: e.target.value,
									},
								});
								if (e.target.value.length !== 1) {
									setStartCharError("유효하지 않은 입력입니다.");
								} else {
									setStartCharError("");
								}
							}}
							className="w-full px-3 py-2 border rounded focus:outline-none"
							placeholder="예: A"
						/>
						{startCharError !== "" && (
							<p className="text-red-500 text-sm mt-1">{startCharError}</p>
						)}
					</div>

					{/* 끝 문자(1글자) */}
					<div>
						<label className="block text-sm font-medium mb-1">끝(~)</label>
						<input
							type="text"
							maxLength={1}
							value={cliCC.priority.endChar}
							onChange={(e) => {
								setCliCC({
									...cliCC,
									priority: {
										...cliCC.priority,
										endChar: e.target.value,
									},
								});
								if (e.target.value.length !== 1) {
									setEndCharError("유효하지 않은 입력입니다.");
								} else {
									setEndCharError("");
								}
							}}
							className="w-full px-3 py-2 border rounded focus:outline-none"
							placeholder="예: Z"
						/>
						{endCharError !== "" && (
							<p className="text-red-500 text-sm mt-1">{endCharError}</p>
						)}
					</div>
				</div>

				{/* 액션 타입 선택 (필패, 필승, 글자계산) */}
				<div className="mt-4 flex items-center space-x-4">
					<label className="flex items-center space-x-1">
						<input
							type="radio"
							name="actionType"
							value="필패"
							checked={cliCC.priority.priority === "los"}
							onChange={() =>
								setCliCC({
									...cliCC,
									priority: {
										...cliCC.priority,
										priority: "los",
									},
								})
							}
						/>
						<span>필패</span>
					</label>

					<label className="flex items-center space-x-1">
						<input
							type="radio"
							name="actionType"
							value="필승"
							checked={cliCC.priority.priority === "win"}
							onChange={() =>
								setCliCC({
									...cliCC,
									priority: {
										...cliCC.priority,
										priority: "win",
									},
								})
							}
						/>
						<span>필승</span>
					</label>

					<label className="flex items-center space-x-1">
						<input
							type="radio"
							name="actionType"
							value="글자계산"
							checked={typeof cliCC.priority.priority === "number"}
							onChange={() =>
								setCliCC({
									...cliCC,
									priority: {
										...cliCC.priority,
										priority: 0,
									},
								})
							}
						/>
						<span>글자계산</span>
					</label>

					{/* 글자계산일 경우 -> 우선순위 숫자 입력칸 표시 */}
					{typeof cliCC.priority.priority === "number" && (
						<input
							type="number"
							className="w-20 px-2 py-1 border rounded"
							placeholder="숫자"
							value={cliCC.priority.priority}
							onChange={(e) =>
								setCliCC({
									...cliCC,
									priority: {
										...cliCC.priority,
										priority: +e.target.value,
									},
								})
							}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
