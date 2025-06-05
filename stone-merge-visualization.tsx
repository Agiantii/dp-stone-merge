"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  HandMetal,
  Presentation,
  AlertCircle,
  BarChart3,
  AlertTriangle,
  Code,
  Copy,
  X,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface DPState {
  dp: number[][]
  split: number[][]
  prefixSum: number[]
}

interface StoneInterval {
  start: number
  end: number
}

interface MergeStep {
  left: number
  right: number
  cost: number
  description: string
  mergedStones: number[]
  mergeLeft: number
  mergeRight: number
  splitPoint: number
  intervals: StoneInterval[]
  highlightIndices: number[]
}

interface UserMergeStep {
  firstIndex: number
  secondIndex: number
  cost: number
  mergedStones: number[]
  intervals: StoneInterval[]
}

export default function StoneMergeVisualization() {
  const [stones, setStones] = useState([1, 3, 3, 2, 4])
  const [inputValue, setInputValue] = useState("1,3,3,2,4")
  const [dpState, setDpState] = useState<DPState | null>(null)
  const [mergeSteps, setMergeSteps] = useState<MergeStep[]>([])
  const [currentStep, setCurrentStep] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStones, setCurrentStones] = useState<number[]>([])
  const [currentIntervals, setCurrentIntervals] = useState<StoneInterval[]>([])
  const [showCodeCard, setShowCodeCard] = useState(false)

  // 用户交互模式相关状态
  const [activeTab, setActiveTab] = useState("auto")
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [userMergeSteps, setUserMergeSteps] = useState<UserMergeStep[]>([])
  const [userTotalCost, setUserTotalCost] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const [warningMessage, setWarningMessage] = useState("")

  const cppCode = `int stoneGame(vector<int>& stones) {
    int n = stones.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));
    vector<int> prefixSum(n + 1, 0);
    
    for (int i = 0; i < n; i++) {
        prefixSum[i + 1] = prefixSum[i] + stones[i];
    }
    
    for (int len = 2; len <= n; len++) {
        for (int i = 0; i <= n - len; i++) {
            int j = i + len - 1;
            dp[i][j] = INT_MAX;
            
            for (int k = i; k < j; k++) {
                int cost = dp[i][k] + dp[k + 1][j] + 
                          (prefixSum[j + 1] - prefixSum[i]);
                dp[i][j] = min(dp[i][j], cost);
            }
        }
    }
    
    return dp[0][n - 1];
}`

  // 计算区间DP
  const calculateDP = useCallback((stones: number[]) => {
    const n = stones.length
    const dp: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0))
    const split: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0))
    const prefixSum: number[] = [0]

    // 计算前缀和
    for (let i = 0; i < n; i++) {
      prefixSum[i + 1] = prefixSum[i] + stones[i]
    }

    // 区间DP
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i <= n - len; i++) {
        const j = i + len - 1
        dp[i][j] = Number.POSITIVE_INFINITY

        for (let k = i; k < j; k++) {
          const cost = dp[i][k] + dp[k + 1][j] + prefixSum[j + 1] - prefixSum[i]
          if (cost < dp[i][j]) {
            dp[i][j] = cost
            split[i][j] = k
          }
        }
      }
    }

    return { dp, split, prefixSum }
  }, [])

  // 生成合并步骤
  const generateMergeSteps = useCallback((stones: number[], split: number[][]) => {
    const steps: MergeStep[] = []

    // 使用一个辅助函数来生成步骤，不修改原始数组
    const generateSteps = (left: number, right: number, originalStones: number[]) => {
      if (left === right) return

      const k = split[left][right]

      // 递归处理左右子区间
      generateSteps(left, k, originalStones)
      generateSteps(k + 1, right, originalStones)

      // 计算合并代价
      const leftSum = originalStones.slice(left, k + 1).reduce((a, b) => a + b, 0)
      const rightSum = originalStones.slice(k + 1, right + 1).reduce((a, b) => a + b, 0)
      const cost = leftSum + rightSum

      steps.push({
        left,
        right,
        cost,
        description: `合并区间 [${left}, ${k}] 和 [${k + 1}, ${right}]，代价: ${cost}`,
        mergedStones: [],
        mergeLeft: left,
        mergeRight: right,
        splitPoint: k,
        intervals: [],
        highlightIndices: [],
      })
    }

    generateSteps(0, stones.length - 1, stones)

    // 现在模拟实际的合并过程来生成每一步的状态
    const simulateSteps = () => {
      let currentStones = [...stones]
      let currentIntervals = stones.map((_, i) => ({ start: i, end: i }))

      for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
        const step = steps[stepIndex]

        // 找到当前状态下对应的区间索引
        let leftIndex = -1
        let rightIndex = -1

        // 寻找包含原始left和right区间的当前石子堆
        for (let i = 0; i < currentIntervals.length; i++) {
          if (currentIntervals[i].start <= step.left && currentIntervals[i].end >= step.splitPoint) {
            leftIndex = i
          }
          if (currentIntervals[i].start <= step.splitPoint + 1 && currentIntervals[i].end >= step.right) {
            rightIndex = i
            break
          }
        }

        // 如果leftIndex和rightIndex相同，说明已经在同一个堆中了，需要分别找左右部分
        if (leftIndex === rightIndex) {
          for (let i = 0; i < currentIntervals.length; i++) {
            if (currentIntervals[i].start === step.left && currentIntervals[i].end === step.splitPoint) {
              leftIndex = i
            }
            if (currentIntervals[i].start === step.splitPoint + 1 && currentIntervals[i].end === step.right) {
              rightIndex = i
            }
          }
        }

        // 更新步骤信息
        step.mergedStones = [...currentStones]
        step.intervals = [...currentIntervals]
        step.highlightIndices = leftIndex >= 0 && rightIndex >= 0 ? [leftIndex, rightIndex] : []

        // 执行合并
        if (leftIndex >= 0 && rightIndex >= 0 && leftIndex !== rightIndex) {
          const newStone = currentStones[leftIndex] + currentStones[rightIndex]
          const newInterval = {
            start: Math.min(currentIntervals[leftIndex].start, currentIntervals[rightIndex].start),
            end: Math.max(currentIntervals[leftIndex].end, currentIntervals[rightIndex].end),
          }

          // 移除旧的石子堆和区间，添加新的
          const minIndex = Math.min(leftIndex, rightIndex)
          const maxIndex = Math.max(leftIndex, rightIndex)

          currentStones = [
            ...currentStones.slice(0, minIndex),
            newStone,
            ...currentStones.slice(minIndex + 1, maxIndex),
            ...currentStones.slice(maxIndex + 1),
          ]

          currentIntervals = [
            ...currentIntervals.slice(0, minIndex),
            newInterval,
            ...currentIntervals.slice(minIndex + 1, maxIndex),
            ...currentIntervals.slice(maxIndex + 1),
          ]
        }
      }
    }

    simulateSteps()
    return steps
  }, [])

  // 处理输入变化
  const handleInputChange = () => {
    try {
      const newStones = inputValue
        .split(",")
        .map((s) => Number.parseInt(s.trim()))
        .filter((n) => !isNaN(n))
      if (newStones.length > 1) {
        setStones(newStones)
        setCurrentStep(-1)
        setIsPlaying(false)
        resetUserMode()
      }
    } catch (error) {
      console.error("Invalid input")
    }
  }

  // 计算DP和生成步骤
  useEffect(() => {
    const dpResult = calculateDP(stones)
    setDpState(dpResult)
    const steps = generateMergeSteps(stones, dpResult.split)
    setMergeSteps(steps)
    setCurrentStones([...stones])
    setCurrentIntervals(stones.map((_, i) => ({ start: i, end: i })))
  }, [stones, calculateDP, generateMergeSteps])

  // 自动播放
  useEffect(() => {
    if (isPlaying && currentStep < mergeSteps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1)
      }, 1500)
      return () => clearTimeout(timer)
    } else if (currentStep >= mergeSteps.length - 1) {
      setIsPlaying(false)
    }
  }, [isPlaying, currentStep, mergeSteps.length])

  // 更新当前石子状态 (自动模式)
  useEffect(() => {
    if (activeTab === "auto") {
      if (currentStep >= 0 && mergeSteps[currentStep]) {
        setCurrentStones([...mergeSteps[currentStep].mergedStones])
        setCurrentIntervals([...mergeSteps[currentStep].intervals])
      } else {
        setCurrentStones([...stones])
        setCurrentIntervals(stones.map((_, i) => ({ start: i, end: i })))
      }
    }
  }, [currentStep, mergeSteps, stones, activeTab])

  // 重置自动模式
  const reset = () => {
    setCurrentStep(-1)
    setIsPlaying(false)
    setCurrentStones([...stones])
    setCurrentIntervals(stones.map((_, i) => ({ start: i, end: i })))
  }

  // 重置用户模式
  const resetUserMode = () => {
    setSelectedIndices([])
    setUserMergeSteps([])
    setUserTotalCost(0)
    setCurrentStones([...stones])
    setCurrentIntervals(stones.map((_, i) => ({ start: i, end: i })))
    setShowWarning(false)
  }

  // 下一步
  const nextStep = () => {
    if (currentStep < mergeSteps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  // 处理石子堆点击 (用户模式)
  const handleStoneClick = (index: number) => {
    if (activeTab !== "user") return

    setShowWarning(false)

    if (selectedIndices.includes(index)) {
      // 取消选择
      setSelectedIndices(selectedIndices.filter((i) => i !== index))
    } else {
      // 添加选择
      if (selectedIndices.length < 2) {
        setSelectedIndices([...selectedIndices, index])
      } else {
        // 如果已经选择了两个，替换第一个
        setSelectedIndices([selectedIndices[1], index])
      }
    }
  }

  // 执行用户合并
  const handleUserMerge = () => {
    if (selectedIndices.length !== 2) {
      setWarningMessage("请选择两个石子堆进行合并")
      setShowWarning(true)
      return
    }

    // 确保索引是有序的
    const [first, second] = selectedIndices.sort((a, b) => a - b)

    // 检查是否相邻
    if (second - first !== 1) {
      setWarningMessage("只能合并相邻的石子堆")
      setShowWarning(true)
      return
    }

    // 计算合并代价
    const cost = currentStones[first] + currentStones[second]

    // 创建新的石子堆
    const newStone = cost
    const newInterval = {
      start: currentIntervals[first].start,
      end: currentIntervals[second].end,
    }

    // 更新石子堆和区间
    const newStones = [...currentStones.slice(0, first), newStone, ...currentStones.slice(second + 1)]
    const newIntervals = [...currentIntervals.slice(0, first), newInterval, ...currentIntervals.slice(second + 1)]

    // 记录用户合并步骤
    const userStep: UserMergeStep = {
      firstIndex: first,
      secondIndex: second,
      cost,
      mergedStones: [...newStones],
      intervals: [...newIntervals],
    }

    setUserMergeSteps([...userMergeSteps, userStep])
    setUserTotalCost(userTotalCost + cost)
    setCurrentStones(newStones)
    setCurrentIntervals(newIntervals)
    setSelectedIndices([])

    // 如果只剩一个石子堆，显示结果比较
    if (newStones.length === 1) {
      const optimalCost = dpState?.dp[0][stones.length - 1] || 0
      if (userTotalCost > optimalCost) {
        toast({
          title: "合并完成！",
          description: `你的总代价: ${userTotalCost}, 最优解代价: ${optimalCost}。你的方案比最优解多花费了 ${userTotalCost - optimalCost}。`,
          duration: 5000,
        })
      } else if (userTotalCost === optimalCost) {
        toast({
          title: "恭喜！",
          description: `你找到了最优解！总代价: ${userTotalCost}`,
          duration: 5000,
        })
      }
    }
  }

  // 切换标签时重置状态
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "auto") {
      reset()
    } else {
      resetUserMode()
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            合并石子 - 区间动态规划可视化
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCodeCard(true)}>
                <Code className="w-4 h-4 mr-1" />
                查看C++代码
              </Button>
              <Link href="/complexity">
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-1" />
                  复杂度对比
                </Button>
              </Link>
              <Link href="/greedy">
                <Button variant="outline" size="sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  贪心算法
                </Button>
              </Link>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-center">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入石子数量，用逗号分隔"
              className="flex-1"
            />
            <Button onClick={handleInputChange}>更新</Button>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="auto" className="flex items-center gap-1">
                <Presentation className="w-4 h-4" />
                自动演示
              </TabsTrigger>
              <TabsTrigger value="user" className="flex items-center gap-1">
                <HandMetal className="w-4 h-4" />
                自己尝试
              </TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => setIsPlaying(!isPlaying)} disabled={currentStep >= mergeSteps.length - 1}>
                  {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                  {isPlaying ? "暂停" : "播放"}
                </Button>
                <Button onClick={nextStep} disabled={currentStep >= mergeSteps.length - 1}>
                  <SkipForward className="w-4 h-4 mr-1" />
                  下一步
                </Button>
                <Button onClick={reset}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  重置
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="user" className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={handleUserMerge} disabled={currentStones.length <= 1}>
                  合并选中的石子堆
                </Button>
                <Button onClick={resetUserMode} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  重置
                </Button>
              </div>

              {showWarning && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>错误</AlertTitle>
                  <AlertDescription>{warningMessage}</AlertDescription>
                </Alert>
              )}

              <div className="text-sm">
                <p>已选择: {selectedIndices.length > 0 ? selectedIndices.map((i) => `堆${i}`).join(", ") : "无"}</p>
                <p>
                  当前总代价: <span className="font-bold">{userTotalCost}</span>
                </p>
                {dpState && (
                  <p>
                    最优解代价: <span className="font-bold">{dpState.dp[0][stones.length - 1]}</span>
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 石子可视化 */}
      <Card>
        <CardHeader>
          <CardTitle>当前石子状态</CardTitle>
        </CardHeader>
        <CardContent>
          <svg width="100%" height="150" viewBox={`0 0 ${Math.max(800, currentStones.length * 120)} 150`}>
            {currentStones.map((stone, index) => {
              // 确定当前石子堆的样式
              let fillColor = "#8B5CF6"
              let strokeColor = "#6D28D9"
              let strokeWidth = "2"

              if (activeTab === "auto" && currentStep >= 0 && mergeSteps[currentStep]) {
                // 自动模式下的高亮
                const step = mergeSteps[currentStep]
                if (step.highlightIndices.includes(index)) {
                  fillColor = "#EF4444"
                  strokeColor = "#B91C1C"
                  strokeWidth = "3"
                }
              } else if (activeTab === "user") {
                // 用户模式下的选中高亮
                if (selectedIndices.includes(index)) {
                  fillColor = "red"
                  strokeColor = "#1D4ED8"
                  strokeWidth = "3"
                }
              }

              return (
                <g
                  key={index}
                  onClick={() => handleStoneClick(index)}
                  style={{ cursor: activeTab === "user" ? "pointer" : "default" }}
                >
                  <rect
                    x={index * 120 + 50}
                    y={30}
                    width={100}
                    height={60}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    rx="8"
                  />
                  <text x={index * 120 + 100} y={65} textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
                    {stone}
                  </text>
                  {/* 区间标记 */}
                  <text
                    x={index * 120 + 100}
                    y={110}
                    textAnchor="middle"
                    fill="#374151"
                    fontSize="14"
                    fontWeight="bold"
                  >
                    [{currentIntervals[index]?.start ?? 0}, {currentIntervals[index]?.end ?? 0}]
                  </text>
                  <text x={index * 120 + 100} y={130} textAnchor="middle" fill="#6B7280" fontSize="12">
                    堆 {index}
                  </text>
                </g>
              )
            })}
          </svg>
        </CardContent>
      </Card>

      <div className="mt-2 flex items-center gap-4 flex-wrap">
        {activeTab === "auto" ? (
          <>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-[#EF4444] rounded"></div>
              <span className="text-sm">正在合并的堆</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-[#8B5CF6] rounded"></div>
              <span className="text-sm">未参与当前合并</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-[#3B82F6] rounded"></div>
              <span className="text-sm">已选择的堆</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-[#8B5CF6] rounded"></div>
              <span className="text-sm">未选择的堆</span>
            </div>
          </>
        )}
      </div>

      {/* 用户合并历史 */}
      {activeTab === "user" && userMergeSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>你的合并历史</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {userMergeSteps.map((step, index) => (
                <div key={index} className="p-3 rounded border bg-gray-50 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span>
                      步骤 {index + 1}: 合并堆 {step.firstIndex} 和堆 {step.secondIndex}，代价: {step.cost}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DP表格 */}
      {dpState && (
        <Card>
          <CardHeader>
            <CardTitle>DP表格 (dp[i][j] = 合并第i堆到第j堆的最小代价)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 bg-gray-100">i\j</th>
                    {stones.map((_, j) => (
                      <th key={j} className="border border-gray-300 p-2 bg-gray-100">
                        {j}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stones.map((_, i) => (
                    <tr key={i}>
                      <td className="border border-gray-300 p-2 bg-gray-100 font-bold">{i}</td>
                      {stones.map((_, j) => (
                        <td
                          key={j}
                          className={`border border-gray-300 p-2 text-center ${
                            i <= j
                              ? j - i === 1
                                ? "bg-yellow-100"
                                : j - i > 1
                                  ? "bg-blue-100"
                                  : "bg-white"
                              : "bg-gray-50"
                          }`}
                        >
                          {i <= j ? (i === j ? "0" : dpState.dp[i][j] || "-") : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p>
                最优解总代价:{" "}
                <span className="font-bold text-lg text-blue-600">{dpState.dp[0][stones.length - 1]}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 合并步骤 */}
      {activeTab === "auto" && (
        <Card>
          <CardHeader>
            <CardTitle>
              合并过程 ({currentStep + 1}/{mergeSteps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {mergeSteps.map((step, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${
                    index === currentStep
                      ? "bg-blue-100 border-blue-300"
                      : index < currentStep
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={index <= currentStep ? "font-medium" : "text-gray-500"}>
                      步骤 {index + 1}: {step.description}
                    </span>
                    {index === currentStep && <span className="text-blue-600 font-bold">← 当前</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 代码卡片弹窗 */}
      {showCodeCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  动态规划 - C++实现
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="default">最优解法</Badge>
                  <span className="text-xs text-gray-500">时间: O(n³), 空间: O(n²)</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(cppCode)
                    toast({ title: "代码已复制到剪贴板" })
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowCodeCard(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono">
                <code>{cppCode}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
