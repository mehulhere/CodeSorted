import React from 'react';
import { Switch } from './switch';
import { Label } from './label';
import { HelpCircle } from 'lucide-react';

interface CodeSubmitOptionsProps {
    useParser: boolean;
    setUseParser: (value: boolean) => void;
}

export function CodeSubmitOptions({ useParser, setUseParser }: CodeSubmitOptionsProps) {
    return (
        <div className="flex flex-col gap-2 p-3 border rounded-md bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-300">Submission Options</h3>

            <div className="flex items-center space-x-2">
                <Switch
                    id="use-parser"
                    checked={useParser}
                    onCheckedChange={setUseParser}
                />
                <Label htmlFor="use-parser" className="text-sm">
                    Use generic input parser
                </Label>
                <div className="relative ml-1 cursor-help group">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <div className="absolute hidden group-hover:block z-10 w-80 p-3 text-xs bg-slate-900 text-slate-200 rounded-md -top-2 left-6 shadow-lg">
                        <p className="mb-2">When enabled, the system will automatically add code to parse common input formats and call your solution function.</p>
                        <p className="font-semibold mb-1">Supports formats like:</p>
                        <ul className="list-disc pl-4 mb-2 space-y-1">
                            <li>Variable assignments: <code className="bg-slate-800 px-1 rounded">nums = [1,2,3], target = 9</code></li>
                            <li>JSON structures, arrays, matrices</li>
                            <li>Single values (integers, strings)</li>
                        </ul>
                        <p className="text-xs text-slate-400">Disable this option if you want to write your own input parsing code.</p>
                    </div>
                </div>
            </div>

            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 pl-8">
                {useParser ? (
                    <div>
                        <p className="mb-1">With the parser enabled, you only need to implement the solution function.</p>
                        <p>Example: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">def twoSum(nums, target): ...</code></p>
                    </div>
                ) : (
                    <div>
                        <p>With the parser disabled, you&apos;ll need to write your own code to:</p>
                        <ul className="list-disc pl-4 mt-1">
                            <li>Parse input from stdin</li>
                            <li>Call your solution function</li>
                            <li>Format and print the output</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
} 