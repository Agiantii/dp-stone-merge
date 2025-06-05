"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Play, Pause, RotateCcw, SkipForward, AlertTriangle, CheckCircle, Home, Code, Copy, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"

interface StoneHeap {
  value: number
  startIndex: number
  endIndex: number
  id: number
}

interface GreedyStep {
  leftIndex: number
  rightIndex: number
  cost: number
  description: string
  heaps: StoneHeap[]
  totalCost: number
}

interface OptimalResult {
  totalCost: number
  steps: number
}

export default function GreedyApproach() {
  const [stones, setStones] = useState([1, 3, 3, 2, 4])
  const [inputValue, setInputValue] = useState("1,3,3,2,4")
  const [greedySteps, setGreedySteps] = useState<GreedyStep[]>([])
  const [currentStep, setCurrentStep] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentHeaps, setCurrentHeaps] = useState<StoneHeap[]>([])
  const [optimalResult, setOptimalResult] = useState<OptimalResult | null>(null)
  const [greedyResult, setGreedyResult] = useState<{ totalCost: number; steps: number } | null>(null)
  const [showCodeCard, setShowCodeCard] = useState(false)

  const greedyCppCode = `int greedyStoneGame(vector<int>& stones) {
    vector<int> heaps = stones;
    int totalCost = 0;
    
    while (heaps.size() > 1) {
        int minCost = INT_MAX;
        int bestIndex = -1;
        
        for (int i = 0; i < heaps.size() - 1; i++) {
            int cost = heaps[i] + heaps[i + 1];
            if (cost < minCost) {
                minCost = cost;
                bestIndex = i;
            }
        }
        
        int newHeap = heaps[bestIndex] + heaps[bestIndex + 1];
        heaps.erase(heaps.begin() + bestIndex, heaps.begin() + bestIndex + 2);
        heaps.insert(heaps.begin() + bestIndex, newHeap);
        
        totalCost += minCost;
    }
    
    return totalCost;
}`

  // 计算最优解（区间DP）
  const calculateOptimal = useCallback((stones: number[]) => {
    const n = stones.length
    const dp: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0))
    const prefix = [0]

    // 计算前缀和
    for (let i = 0; i < n; i++) {
      prefix[i + 1] = prefix[i] + stones[i]
    }

    // 区间DP
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i <= n - len; i++) {
        const j = i + len - 1
        dp[i][j] = Number.POSITIVE_INFINITY

        for (let k = i; k < j; k++) {
          const cost = dp[i][k] + dp[k + 1][j] + prefix[j + 1] - prefix[i]
          if (cost < dp[i][j]) {
            dp[i][j] = cost
          }
        }
      }
    }

    return {
      totalCost: dp[0][n - 1],
      steps: n - 1,
    }
  }, [])

  // 贪心算法：每次选择相邻的最小合并代价
  const generateGreedySteps = useCallback((stones: number[]) => {
    const steps: GreedyStep[] = []
    let currentHeaps: StoneHeap[] = stones.map((value, index) => ({
      value,
      startIndex: index,
      endIndex: index,
      id: index,
    }))

    let totalCost = 0
    let nextId = stones.length

    while (currentHeaps.length > 1) {
      // 找到相邻的最小合并代价
      let minCost = Number.POSITIVE_INFINITY
      let bestLeftIndex = -1
      let bestRightIndex = -1

      for (let i = 0; i < currentHeaps.length - 1; i++) {
        const cost = currentHeaps[i].value + currentHeaps[i + 1].value
        if (cost < minCost) {
          minCost = cost
          bestLeftIndex = i
          bestRightIndex = i + 1
        }
      }

      // 执行合并
      const leftHeap = currentHeaps[bestLeftIndex]
      const rightHeap = currentHeaps[bestRightIndex]
      const newHeap: StoneHeap = {
        value: leftHeap.value + rightHeap.value,
        startIndex: leftHeap.startIndex,
        endIndex: rightHeap.endIndex,
        id: nextId++,
      }

      totalCost += minCost

      // 记录步骤
      steps.push({
        leftIndex: bestLeftIndex,
        rightIndex: bestRightIndex,
        cost: minCost,
        description: `贪心选择：合并堆${bestLeftIndex}(${leftHeap.value}) 和 堆${bestRightIndex}(${rightHeap.value})，代价: ${minCost}`,
        heaps: [...currentHeaps],
        totalCost,
      })

      // 更新堆数组
      currentHeaps = [...currentHeaps.slice(0, bestLeftIndex), newHeap, ...currentHeaps.slice(bestRightIndex + 1)]
    }

    return { steps, totalCost }
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
      }
    } catch (error) {
      console.error("Invalid input")
    }
  }

  // 计算结果
  useEffect(() => {
    const optimal = calculateOptimal(stones)
    setOptimalResult(optimal)

    const { steps, totalCost } = generateGreedySteps(stones)
    setGreedySteps(steps)
    setGreedyResult({ totalCost, steps: steps.length })

    // 初始化堆状态
    const initialHeaps = stones.map((value, index) => ({
      value,
      startIndex: index,
      endIndex: index,
      id: index,
    }))
    setCurrentHeaps(initialHeaps)
  }, [stones, calculateOptimal, generateGreedySteps])

  // 自动播放
  useEffect(() => {
    if (isPlaying && currentStep < greedySteps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1)
      }, 2000)
      return () => clearTimeout(timer)
    } else if (currentStep >= greedySteps.length - 1) {
      setIsPlaying(false)
    }
  }, [isPlaying, currentStep, greedySteps.length])

  // 更新当前堆状态
  useEffect(() => {
    if (currentStep >= 0 && greedySteps[currentStep]) {
      setCurrentHeaps([...greedySteps[currentStep].heaps])
    } else {
      const initialHeaps = stones.map((value, index) => ({
        value,
        startIndex: index,
        endIndex: index,
        id: index,
      }))
      setCurrentHeaps(initialHeaps)
    }
  }, [currentStep, greedySteps, stones])

  const reset = () => {
    setCurrentStep(-1)
    setIsPlaying(false)
    const initialHeaps = stones.map((value, index) => ({
      value,
      startIndex: index,
      endIndex: index,
      id: index,
    }))
    setCurrentHeaps(initialHeaps)
  }

  const nextStep = () => {
    if (currentStep < greedySteps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const getDifference = () => {
    if (!optimalResult || !greedyResult) return 0
    return greedyResult.totalCost - optimalResult.totalCost
  }

  const isOptimal = () => {
    return getDifference() === 0
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              贪心算法 - 错误的解法演示
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCodeCard(true)}>
                <Code className="w-4 h-4 mr-1" />
                查看C++代码
              </Button>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-1" />
                  返回主页
                </Button>
              </Link>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>算法说明</AlertTitle>
            <AlertDescription>
              贪心策略：每次选择相邻的两堆石子中合并代价最小的进行合并。这种方法类似于哈夫曼编码的构造过程，但对于石子合并问题并不总是最优的。
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 items-center">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入石子数量，用逗号分隔"
              className="flex-1"
            />
            <Button onClick={handleInputChange}>更新</Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setIsPlaying(!isPlaying)} disabled={currentStep >= greedySteps.length - 1}>
              {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              {isPlaying ? "暂停" : "播放"}
            </Button>
            <Button onClick={nextStep} disabled={currentStep >= greedySteps.length - 1}>
              <SkipForward className="w-4 h-4 mr-1" />
              下一步
            </Button>
            <Button onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 结果对比 */}
      {optimalResult && greedyResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{optimalResult.totalCost}</div>
                <div className="text-sm text-gray-600">最优解代价</div>
                <Badge variant="secondary" className="mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  动态规划
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${isOptimal() ? "text-green-600" : "text-red-600"}`}>
                  {greedyResult.totalCost}
                </div>
                <div className="text-sm text-gray-600">贪心算法代价</div>
                <Badge variant={isOptimal() ? "default" : "destructive"} className="mt-1">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  贪心策略
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${isOptimal() ? "text-green-600" : "text-red-600"}`}>
                  {isOptimal() ? "0" : `+${getDifference()}`}
                </div>
                <div className="text-sm text-gray-600">额外代价</div>
                <Badge variant={isOptimal() ? "default" : "destructive"} className="mt-1">
                  {isOptimal() ? "最优!" : "次优"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 石子可视化 */}
      <Card>
        <CardHeader>
          <CardTitle>当前石子状态</CardTitle>
        </CardHeader>
        <CardContent>
          <svg width="100%" height="150" viewBox={`0 0 ${Math.max(800, currentHeaps.length * 120)} 150`}>
            {currentHeaps.map((heap, index) => {
              // 确定当前堆的颜色
              let fillColor = "#8B5CF6"
              let strokeColor = "#6D28D9"
              let strokeWidth = "2"

              if (currentStep >= 0 && greedySteps[currentStep]) {
                const step = greedySteps[currentStep]
                if (index === step.leftIndex || index === step.rightIndex) {
                  fillColor = "#EF4444"
                  strokeColor = "#B91C1C"
                  strokeWidth = "3"
                }
              }

              return (
                <g key={heap.id}>
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
                    {heap.value}
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
                    [{heap.startIndex}, {heap.endIndex}]
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

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-[#EF4444] rounded"></div>
          <span className="text-sm">贪心选择的堆</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-[#8B5CF6] rounded"></div>
          <span className="text-sm">未选择的堆</span>
        </div>
      </div>

      {/* 贪心步骤 */}
      <Card>
        <CardHeader>
          <CardTitle>
            贪心合并过程 ({currentStep + 1}/{greedySteps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {greedySteps.map((step, index) => (
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
                <div className="text-sm text-gray-600 mt-1">累计代价: {step.totalCost}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 算法分析 */}
      <Card>
        <CardHeader>
          <CardTitle>算法分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-red-600 mb-2">贪心算法的问题</h4>
              <ul className="text-sm space-y-1">
                <li>• 只考虑局部最优，忽略全局影响</li>
                <li>• 早期的"便宜"合并可能导致后期昂贵的操作</li>
                <li>• 无法回溯和重新选择</li>
                <li>• 时间复杂度: O(n²)</li>
                <li>• 空间复杂度: O(n)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-600 mb-2">动态规划的优势</h4>
              <ul className="text-sm space-y-1">
                <li>• 考虑所有可能的合并方案</li>
                <li>• 通过子问题最优解构造全局最优解</li>
                <li>• 保证找到最优解</li>
                <li>• 时间复杂度: O(n³)</li>
                <li>• 空间复杂度: O(n²)</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-orange-50 rounded-lg">
            <h4 className="font-semibold text-orange-800 mb-2">为什么贪心算法在这里失效？</h4>
            <p className="text-sm text-orange-700">
              石子合并问题具有"后效性"：当前的合并选择会影响后续所有可能的合并操作。
              贪心算法只看当前最小代价，但可能导致后续必须进行代价更高的合并。
              例如，合并两个小堆可能会阻止后续更优的分割方案。
            </p>
          </div>

          {!isOptimal() && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">当前案例分析</h4>
              <p className="text-sm text-red-700">
                贪心算法的总代价为 {greedyResult?.totalCost}，比最优解多花费了 {getDifference()} 的代价。
                这说明贪心策略在这个例子中并不是最优的。
              </p>
            </div>
          )}

          {isOptimal() && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">特殊情况</h4>
              <p className="text-sm text-green-700">
                在这个例子中，贪心算法恰好找到了最优解！但这并不意味着贪心算法总是正确的。
                尝试其他的石子组合，你会发现贪心算法经常产生次优解。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 代码卡片弹窗 */}
      {showCodeCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  贪心算法 - C++实现
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="destructive">错误解法</Badge>
                  <span className="text-xs text-gray-500">时间: O(n²), 空间: O(n)</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(greedyCppCode)
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
                <code>{greedyCppCode}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
