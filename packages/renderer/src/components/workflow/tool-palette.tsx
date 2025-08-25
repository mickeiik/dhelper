// import { useState } from 'react';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Search, Wrench } from 'lucide-react';
// import { ToolMetadata } from '@app/types';

// interface ToolPaletteProps {
//   tools: ToolMetadata<Record<string, unknown>>[];
// }

// export function ToolPalette({ tools }: ToolPaletteProps) {
//   const [searchQuery, setSearchQuery] = useState('');

//   const filteredTools = tools.filter(tool =>
//     tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     tool.category?.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   const onDragStart = (event: React.DragEvent<HTMLDivElement>, toolId: string) => {
//     event.dataTransfer.effectAllowed = 'move';
//     event.dataTransfer.setData('application/reactflow', JSON.stringify({ toolId }));
//   }

//   return (
//     <div className="w-80 border-r flex flex-col h-full">
//       {/* Header */}
//       <div className="p-2 pt-0 border-b">
//         <h2 className="text-lg font-semibold mb-3">Tool Palette</h2>

//         {/* Search */}
//         <div className="relative">
//           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
//           <Input
//             placeholder="Search tools..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="pl-10"
//           />
//         </div>
//       </div>

//       {/* Tools List - Scrollable */}
//       <div className='flex-1 overflow-y-auto min-h-0'>
//         <div className="p-4">
//           {filteredTools.length === 0 ? (
//             <p className="text-sm text-muted-foreground text-center py-8">
//               {searchQuery ? 'No tools match your search' : 'No tools available'}
//             </p>
//           ) : (
//             filteredTools.map((tool, index) => (
//               <Card onDragStart={(e) => onDragStart(e, tool.id)} draggable key={`${tool.id}-${index}`} className="hover:shadow-md transition-shadow mb-3">
//                 <CardHeader className="pb-2">
//                   <CardTitle className="text-sm flex items-center justify-between">
//                     <div className="flex items-center gap-2">
//                       <Wrench className="size-4" />
//                       <span className="truncate">{tool.name}</span>
//                     </div>
//                   </CardTitle>
//                 </CardHeader>

//                 <CardContent className="pt-0">
//                   {tool.description && (
//                     <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
//                       {tool.description}
//                     </p>
//                   )}

//                   {tool.category && (
//                     <span className="inline-block text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
//                       {tool.category}
//                     </span>
//                   )}

//                   <div className="mt-2 flex gap-4">
//                     {tool.inputFields && tool.inputFields.length > 0 && (
//                       <p className="text-xs font-medium text-muted-foreground">
//                         {tool.inputFields.length} input{tool.inputFields.length !== 1 ? 's' : ''}
//                       </p>
//                     )}
//                     {tool.outputFields && tool.outputFields.length > 0 && (
//                       <p className="text-xs font-medium text-muted-foreground">
//                         {tool.outputFields.length} output{tool.outputFields.length !== 1 ? 's' : ''}
//                       </p>
//                     )}
//                   </div>
//                 </CardContent>
//               </Card>
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }