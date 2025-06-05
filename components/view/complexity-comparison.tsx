"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Play, RotateCcw, Timer, TrendingUp, Home, Code, Copy, X } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"

interface CallRecord {
  i: number
  j: number
  count: number
  depth: number
  children: CallRecord[]
  result?: number
}

interface ComparisonResult {
  memoizedCalls: number
  nonMemoizedCalls: number
  memoizedTree: CallRecord
  nonMemoizedTree: CallRecord
  executionTime: {
    memoized: number
    nonMemoized: number
  }
}

export default function ComplexityComparison() {
  const [stones, setStones] = useState([1, 3, 3, 2, 3, 5])
  const [inputValue, setInputValue] = useState("1, 3, 3, 2, 3, 5")
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [activeTab, setActiveTab] = useState("memoized")
  const [showCodeCard, setShowCodeCard] = useState(false)
  const [codeType, setCodeType] = useState<"memoized" | "nonMemoized">("memoized")

  const memoizedCppCode = `int stoneGameMemo(vector<int>& stones) {
    int n = stones.size();
    vector<vector<int>> memo(n, vector<int>(n, -1));
    vector<int> prefixSum(n + 1, 0);
    
    for (int i = 0; i < n; i++) {
        prefixSum[i + 1] = prefixSum[i] + stones[i];
    }
    
    function<int(int, int)> dfs = [&](int i, int j) -> int {
        if (i == j) return 0;
        if (memo[i][j] != -1) return memo[i][j];
        
        int sum_ij = prefixSum[j + 1] - prefixSum[i];
        memo[i][j] = INT_MAX;
        
        for (int k = i; k < j; k++) {
            int cost = dfs(i, k) + dfs(k + 1, j) + sum_ij;
            memo[i][j] = min(memo[i][j], cost);
        }
        
        return memo[i][j];
    };
    
    return dfs(0, n - 1);
}`

  const nonMemoizedCppCode = `int stoneGameRecursive(vector<int>& stones) {
    int n = stones.size();
    vector<int> prefixSum(n + 1, 0);
    
    for (int i = 0; i < n; i++) {
        prefixSum[i + 1] = prefixSum[i] + stones[i];
    }
    
    function<int(int, int)> dfs = [&](int i, int j) -> int {
        if (i == j) return 0;
        
        int sum_ij = prefixSum[j + 1] - prefixSum[i];
        int minCost = INT_MAX;
        
        for (int k = i; k < j; k++) {
            int cost = dfs(i, k) + dfs(k + 1, j) + sum_ij;
            minCost = min(minCost, cost);
        }
        
        return minCost;
    };
    
    return dfs(0, n - 1);
}`

  // 记忆化搜索
  const memoizedSearch = useCallback((stones: number[]) => {
    const n = stones.length
    const prefix = [0]
    const dp: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(Number.POSITIVE_INFINITY))
    const split: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0))

    // 计算前缀和
    for (let i = 0; i < n; i++) {
      prefix[i + 1] = prefix[i] + stones[i]
    }

    let callCount = 0
    const callTree: CallRecord = { i: 0, j: n - 1, count: 0, depth: 0, children: [] }
    const callMap = new Map<string, CallRecord>()

    const dfs = (i: number, j: number, depth: number, parent?: CallRecord): number => {
      
      callCount++
      const key = `${i},${j}`

      if (!callMap.has(key)) {
        const record: CallRecord = { i, j, count: 0, depth, children: [] }
        callMap.set(key, record)
        if (parent) {
          parent.children.push(record)
        }
      }

      const record = callMap.get(key)!
      record.count++

      if (i === j) {
        record.result = 0
        return 0
      }

      if (dp[i][j] !== Number.POSITIVE_INFINITY) {
        return dp[i][j]
      }

      const sum_ij = prefix[j + 1] - prefix[i]

      for (let k = i; k < j; k++) {
        const cost = dfs(i, k, depth + 1, record) + dfs(k + 1, j, depth + 1, record) + sum_ij
        if (cost < dp[i][j]) {
          dp[i][j] = cost
          split[i][j] = k
        }
      }

      record.result = dp[i][j]
      return dp[i][j]
    }

    const startTime = performance.now()
    dfs(0, n - 1, 0)
    const endTime = performance.now()

    return {
      callCount,
      tree: callMap.get("0," + (n - 1))!,
      executionTime: endTime - startTime,
    }
  }, [])

  // 非记忆化搜索
  const nonMemoizedSearch = useCallback((stones: number[]) => {
    const n = stones.length
    const prefix = [0]
    const dp: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(Number.POSITIVE_INFINITY))
    const split: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0))

    // 计算前缀和
    for (let i = 0; i < n; i++) {
      prefix[i + 1] = prefix[i] + stones[i]
    }

    let callCount = 0
    const callTree: CallRecord = { i: 0, j: n - 1, count: 0, depth: 0, children: [] }
    const allCalls: CallRecord[] = []

    const dfs = (i: number, j: number, depth: number, parent?: CallRecord): number => {
      callCount++

      const record: CallRecord = { i, j, count: 1, depth, children: [] }
      allCalls.push(record)

      if (parent) {
        parent.children.push(record)
      }

      if (i === j) {
        record.result = 0
        return 0
      }

      const sum_ij = prefix[j + 1] - prefix[i]
      let minCost = Number.POSITIVE_INFINITY

      for (let k = i; k < j; k++) {
        const cost = dfs(i, k, depth + 1, record) + dfs(k + 1, j, depth + 1, record) + sum_ij
        if (cost < minCost) {
          minCost = cost
        }
      }

      record.result = minCost
      return minCost
    }

    const startTime = performance.now()
    dfs(0, n - 1, 0, callTree)
    const endTime = performance.now()

    return {
      callCount,
      tree: callTree.children[0] || callTree,
      executionTime: endTime - startTime,
    }
  }, [])

  // 执行比较
  const runComparison = async () => {
    setIsCalculating(true)

    // 添加延迟以显示加载状态
    await new Promise((resolve) => setTimeout(resolve, 100))

    const memoizedResult = memoizedSearch(stones)
    const nonMemoizedResult = nonMemoizedSearch(stones)

    setResult({
      memoizedCalls: memoizedResult.callCount,
      nonMemoizedCalls: nonMemoizedResult.callCount,
      memoizedTree: memoizedResult.tree,
      nonMemoizedTree: nonMemoizedResult.tree,
      executionTime: {
        memoized: memoizedResult.executionTime,
        nonMemoized: nonMemoizedResult.executionTime,
      },
    })

    setIsCalculating(false)
  }

  // 处理输入变化
  const handleInputChange = () => {
    try {
      const newStones = inputValue
        .split(",")
        .map((s) => Number.parseInt(s.trim()))
        .filter((n) => !isNaN(n))
      if (newStones.length >= 2 && newStones.length <= 6) {
        setStones(newStones)
        setResult(null)
      }
    } catch (error) {
      console.error("Invalid input")
    }
  }

  // 重置
  const reset = () => {
    setResult(null)
  }

  // 渲染树节点
  const renderTreeNode = (node: CallRecord, x: number, y: number, level: number, maxWidth: number) => {
    const nodeSize = Math.max(20, Math.min(60, 20 + node.count * 3))
    const color = node.count === 1 ? "#10B981" : `hsl(${Math.max(0, 120 - node.count * 10)}, 70%, 50%)`

    const children = node.children || []
    const childSpacing = maxWidth / Math.max(1, children.length)

    return (
      <g key={`${node.i}-${node.j}-${level}`}>
        {/* 连接线到子节点 */}
        {children.map((child, index) => {
          const childX = x - maxWidth / 2 + childSpacing * (index + 0.5)
          const childY = y + 100
          return (
            <line
              key={`line-${child.i}-${child.j}`}
              x1={x}
              y1={y + nodeSize / 2}
              x2={childX}
              y2={childY - nodeSize / 2}
              stroke="#6B7280"
              strokeWidth="1"
            />
          )
        })}

        {/* 当前节点 */}
        <circle cx={x} cy={y} r={nodeSize / 2} fill={color} stroke="#374151" strokeWidth="2" />

        {/* 节点标签 */}
        <text x={x} y={y - 5} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
          [{node.i},{node.j}]
        </text>
        <text x={x} y={y + 8} textAnchor="middle" fill="white" fontSize="8">
          ×{node.count}
        </text>

        {/* 递归渲染子节点 */}
        {children.map((child, index) => {
          const childX = x - maxWidth / 2 + childSpacing * (index + 0.5)
          const childY = y + 100
          const childMaxWidth = (maxWidth / Math.max(1, children.length)) * 0.8

          return renderTreeNode(child, childX, childY, level + 1, childMaxWidth)
        })}
      </g>
    )
  }

  // 计算树的最大宽度
  const calculateTreeWidth = (node: CallRecord, level = 0): number => {
    if (!node.children || node.children.length === 0) {
      return 80
    }

    const childWidths = node.children.map((child) => calculateTreeWidth(child, level + 1))
    return Math.max(
      200,
      childWidths.reduce((sum, width) => sum + width, 0),
    )
  }

  const showCode = (type: "memoized" | "nonMemoized") => {
    setCodeType(type)
    setShowCodeCard(true)
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            合并石子 - 记忆化搜索 vs 非记忆化搜索复杂度对比
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => showCode("memoized")}>
                <Code className="w-4 h-4 mr-1" />
                记忆化代码
              </Button>
              <Button variant="outline" size="sm" onClick={() => showCode("nonMemoized")}>
                <Code className="w-4 h-4 mr-1" />
                非记忆化代码
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
          <div className="flex gap-2 items-center">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入石子数量，用逗号分隔 (建议2-6个)"
              className="flex-1"
            />
            <Button onClick={handleInputChange}>更新</Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={runComparison} disabled={isCalculating}>
              {isCalculating ? (
                <>
                  <Timer className="w-4 h-4 mr-1 animate-spin" />
                  计算中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  开始比较
                </>
              )}
            </Button>
            <Button onClick={reset} variant="outline">
              <RotateCcw className="w-4 h-4 mr-1" />
              重置
            </Button>
          </div>

          {result && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.memoizedCalls}</div>
                    <div className="text-sm text-gray-600">记忆化搜索调用次数</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{result.nonMemoizedCalls}</div>
                    <div className="text-sm text-gray-600">非记忆化搜索调用次数</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(result.nonMemoizedCalls / result.memoizedCalls).toFixed(1)}×
                    </div>
                    <div className="text-sm text-gray-600">性能提升倍数</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="memoized" className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              记忆化搜索树
            </TabsTrigger>
            <TabsTrigger value="nonMemoized" className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              非记忆化搜索树
            </TabsTrigger>
          </TabsList>

          <TabsContent value="memoized">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  记忆化搜索调用树
                  <Badge variant="secondary">总调用: {result.memoizedCalls}</Badge>
                  <Badge variant="outline">{result.executionTime.memoized.toFixed(2)}ms</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <svg
                    width={Math.max(800, calculateTreeWidth(result.memoizedTree))}
                    height="600"
                    viewBox={`0 0 ${Math.max(800, calculateTreeWidth(result.memoizedTree))} 600`}
                  >
                    {renderTreeNode(
                      result.memoizedTree,
                      Math.max(400, calculateTreeWidth(result.memoizedTree) / 2),
                      50,
                      0,
                      Math.max(600, calculateTreeWidth(result.memoizedTree) * 0.8),
                    )}
                  </svg>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>• 圆圈大小表示调用次数，颜色从绿色(1次)到红色(多次)</p>
                  <p>• [i,j] 表示计算区间 [i,j] 的最小合并代价</p>
                  <p>• 记忆化搜索避免了重复计算，每个子问题最多计算一次</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nonMemoized">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  非记忆化搜索调用树
                  <Badge variant="destructive">总调用: {result.nonMemoizedCalls}</Badge>
                  <Badge variant="outline">{result.executionTime.nonMemoized.toFixed(2)}ms</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <svg
                    width={Math.max(800, calculateTreeWidth(result.nonMemoizedTree))}
                    height="600"
                    viewBox={`0 0 ${Math.max(800, calculateTreeWidth(result.nonMemoizedTree))} 600`}
                  >
                    {renderTreeNode(
                      result.nonMemoizedTree,
                      Math.max(400, calculateTreeWidth(result.nonMemoizedTree) / 2),
                      50,
                      0,
                      Math.max(600, calculateTreeWidth(result.nonMemoizedTree) * 0.8),
                    )}
                  </svg>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>• 每个节点都是一次独立的函数调用</p>
                  <p>• 相同的子问题会被重复计算多次</p>
                  <p>• 时间复杂度呈指数级增长</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>复杂度分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">记忆化搜索</h4>
                <ul className="text-sm space-y-1">
                  <li>• 时间复杂度: O(n³)</li>
                  <li>• 空间复杂度: O(n²)</li>
                  <li>• 每个子问题最多计算一次</li>
                  <li>• 总共有 O(n²) 个不同的子问题</li>
                  <li>• 实际调用次数: {result.memoizedCalls}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-red-600 mb-2">非记忆化搜索</h4>
                <ul className="text-sm space-y-1">
                  <li>• 时间复杂度: O(2ⁿ) 或更高</li>
                  <li>• 空间复杂度: O(n) (递归栈)</li>
                  <li>• 大量重复计算相同子问题</li>
                  <li>• 调用次数随n指数级增长</li>
                  <li>• 实际调用次数: {result.nonMemoizedCalls}</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">性能对比</h4>
              <p className="text-sm text-blue-700">
                记忆化搜索比非记忆化搜索快了{" "}
                <strong>{(result.nonMemoizedCalls / result.memoizedCalls).toFixed(1)} 倍</strong>， 执行时间从{" "}
                {result.executionTime.nonMemoized.toFixed(2)}ms 减少到 {result.executionTime.memoized.toFixed(2)}ms。
                随着问题规模增大，这个差距会变得更加显著。
              </p>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">如何看这个图</h4>
              <p className="text-sm text-blue-700">
                如对于 [2,5]  记忆化搜索 被调用了2次 分别是 [1,1]&[2,5] 以及  [0,1]&[2,5]
                在搜索过程中，在 [0,0]&[1,5]合并过程算出来了,因此对于[0,1]合并[2,5]时就不需要重复计算了。
              </p>
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
                  {codeType === "memoized" ? "记忆化搜索" : "非记忆化搜索"} - C++实现
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={codeType === "memoized" ? "default" : "secondary"}>
                    {codeType === "memoized" ? "正确解法" : "低效解法"}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {codeType === "memoized" ? "时间: O(n³), 空间: O(n²)" : "时间: O(2ⁿ), 空间: O(n)"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const code = codeType === "memoized" ? memoizedCppCode : nonMemoizedCppCode
                    navigator.clipboard.writeText(code)
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
                <code>{codeType === "memoized" ? memoizedCppCode : nonMemoizedCppCode}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
