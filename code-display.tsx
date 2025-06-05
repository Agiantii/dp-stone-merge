"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CodeDisplayProps {
  variant?: "button" | "inline"
}

export default function CodeDisplay({ variant = "button" }: CodeDisplayProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = async (code: string, codeType: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(codeType)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error("Failed to copy code:", err)
    }
  }

  const algorithms = {
    greedy: {
      title: "贪心算法",
      description: "每次选择相邻石子堆中合并代价最小的",
      complexity: "时间: O(n²), 空间: O(n)",
      status: "错误解法",
      statusColor: "destructive" as const,
      code: `// 贪心算法 - 错误的解法
function greedyStonesMerge(stones) {
    const n = stones.length;
    let heaps = [...stones]; // 当前石子堆
    let totalCost = 0;
    
    while (heaps.length > 1) {
        // 找到相邻的最小合并代价
        let minCost = Infinity;
        let bestIndex = -1;
        
        for (let i = 0; i < heaps.length - 1; i++) {
            const cost = heaps[i] + heaps[i + 1];
            if (cost < minCost) {
                minCost = cost;
                bestIndex = i;
            }
        }
        
        // 执行合并
        const newHeap = heaps[bestIndex] + heaps[bestIndex + 1];
        heaps = [
            ...heaps.slice(0, bestIndex),
            newHeap,
            ...heaps.slice(bestIndex + 2)
        ];
        
        totalCost += minCost;
    }
    
    return totalCost;
}`,
    },
    memoized: {
      title: "记忆化搜索",
      description: "递归 + 记忆化，避免重复计算",
      complexity: "时间: O(n³), 空间: O(n²)",
      status: "正确解法",
      statusColor: "default" as const,
      code: `// 记忆化搜索 - 正确的解法
function memoizedStonesMerge(stones) {
    const n = stones.length;
    const prefix = [0];
    const dp = Array(n).fill(0).map(() => Array(n).fill(-1));
    const split = Array(n).fill(0).map(() => Array(n).fill(0));
    
    // 计算前缀和
    for (let i = 0; i < n; i++) {
        prefix[i + 1] = prefix[i] + stones[i];
    }
    
    // 记忆化递归函数
    function dfs(i, j) {
        if (i === j) return 0; // 单堆石子无需合并
        if (dp[i][j] !== -1) return dp[i][j]; // 已经计算过
        
        const sum_ij = prefix[j + 1] - prefix[i]; // 区间和
        dp[i][j] = Infinity;
        
        // 枚举分割点k
        for (let k = i; k < j; k++) {
            const cost = dfs(i, k) + dfs(k + 1, j) + sum_ij;
            if (cost < dp[i][j]) {
                dp[i][j] = cost;
                split[i][j] = k; // 记录最优分割点
            }
        }
        
        return dp[i][j];
    }
    
    return dfs(0, n - 1);
}`,
    },
    nonMemoized: {
      title: "非记忆化搜索",
      description: "纯递归，存在大量重复计算",
      complexity: "时间: O(2ⁿ), 空间: O(n)",
      status: "低效解法",
      statusColor: "secondary" as const,
      code: `// 非记忆化搜索 - 低效的解法
function nonMemoizedStonesMerge(stones) {
    const n = stones.length;
    const prefix = [0];
    
    // 计算前缀和
    for (let i = 0; i < n; i++) {
        prefix[i + 1] = prefix[i] + stones[i];
    }
    
    // 纯递归函数（无记忆化）
    function dfs(i, j) {
        if (i === j) return 0; // 单堆石子无需合并
        
        const sum_ij = prefix[j + 1] - prefix[i]; // 区间和
        let minCost = Infinity;
        
        // 枚举分割点k
        for (let k = i; k < j; k++) {
            const cost = dfs(i, k) + dfs(k + 1, j) + sum_ij;
            minCost = Math.min(minCost, cost);
        }
        
        return minCost;
    }
    
    return dfs(0, n - 1);
}`,
    },
    dp: {
      title: "动态规划 (循环)",
      description: "自底向上的动态规划，最优解法",
      complexity: "时间: O(n³), 空间: O(n²)",
      status: "最优解法",
      statusColor: "default" as const,
      code: `// 动态规划 (循环) - 最优解法
function dpStonesMerge(stones) {
    const n = stones.length;
    const prefix = [0];
    const dp = Array(n).fill(0).map(() => Array(n).fill(0));
    const split = Array(n).fill(0).map(() => Array(n).fill(0));
    
    // 计算前缀和
    for (let i = 0; i < n; i++) {
        prefix[i + 1] = prefix[i] + stones[i];
    }
    
    // 区间DP：按长度从小到大填表
    for (let len = 2; len <= n; len++) {
        for (let i = 0; i <= n - len; i++) {
            const j = i + len - 1;
            dp[i][j] = Infinity;
            
            // 枚举分割点k
            for (let k = i; k < j; k++) {
                const cost = dp[i][k] + dp[k + 1][j] + 
                           (prefix[j + 1] - prefix[i]);
                if (cost < dp[i][j]) {
                    dp[i][j] = cost;
                    split[i][j] = k; // 记录最优分割点
                }
            }
        }
    }
    
    return dp[0][n - 1];
}`,
    },
  }

  const CodeBlock = ({ algorithm, codeKey }: { algorithm: any; codeKey: string }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{algorithm.title}</h3>
          <p className="text-sm text-gray-600">{algorithm.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={algorithm.statusColor}>{algorithm.status}</Badge>
            <span className="text-xs text-gray-500">{algorithm.complexity}</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(algorithm.code, codeKey)}
          className="flex items-center gap-1"
        >
          {copiedCode === codeKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copiedCode === codeKey ? "已复制" : "复制"}
        </Button>
      </div>
      <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
        <code className="language-javascript">{algorithm.code}</code>
      </pre>
    </div>
  )

  if (variant === "inline") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            算法代码实现
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="dp" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="dp">动态规划</TabsTrigger>
              <TabsTrigger value="memoized">记忆化</TabsTrigger>
              <TabsTrigger value="nonMemoized">非记忆化</TabsTrigger>
              <TabsTrigger value="greedy">贪心算法</TabsTrigger>
            </TabsList>

            {Object.entries(algorithms).map(([key, algorithm]) => (
              <TabsContent key={key} value={key}>
                <CodeBlock algorithm={algorithm} codeKey={key} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Code className="w-4 h-4 mr-1" />
          查看代码
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            合并石子算法代码实现
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="dp" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="dp">动态规划</TabsTrigger>
            <TabsTrigger value="memoized">记忆化</TabsTrigger>
            <TabsTrigger value="nonMemoized">非记忆化</TabsTrigger>
            <TabsTrigger value="greedy">贪心算法</TabsTrigger>
          </TabsList>

          {Object.entries(algorithms).map(([key, algorithm]) => (
            <TabsContent key={key} value={key}>
              <CodeBlock algorithm={algorithm} codeKey={key} />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
