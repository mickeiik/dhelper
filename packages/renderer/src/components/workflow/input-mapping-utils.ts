// import type { ToolOutputField } from '@app/types';

// export interface InputOption {
//   value: string;
//   label: string;
//   type: string;
//   description?: string;
// }

// export function generateInputOptionsFromSources(
//   connectedSources: Record<string, { toolId: string; outputFields: ToolOutputField[] }>
// ): InputOption[] {
//   const options: InputOption[] = [];

//   Object.entries(connectedSources).forEach(([sourceNodeId, sourceInfo]) => {
//     // Check if this source returns an array
//     const isArraySource = sourceInfo.outputFields.some(field => field.type === 'array');
    
//     if (isArraySource) {
//       // For array sources, generate options based on the array element structure
//       // Look for array element field definitions (fields with names like "result[].property")
//       const arrayElementFields = sourceInfo.outputFields.filter(field => 
//         field.name.includes('[].')
//       );
      
//       if (arrayElementFields.length > 0) {
//         // Add options for array element properties (without specific index)
//         arrayElementFields.forEach(field => {
//           const propertyName = field.name.split('[].')[1]; // Extract property name after "[]."
//           options.push({
//             value: `${sourceNodeId}[].${propertyName}`,
//             label: `${sourceInfo.toolId}[]: ${propertyName}`,
//             type: field.type,
//             description: field.description || `${propertyName} from ${sourceInfo.toolId} array element`
//           });
//         });
        
//         // Also add option for the whole array element
//         options.push({
//           value: `${sourceNodeId}[]`,
//           label: `${sourceInfo.toolId}[] (complete element)`,
//           type: 'object',
//           description: `Complete array element from ${sourceInfo.toolId}`
//         });
//       } else {
//         // Fallback: treat as array of primitive values
//         options.push({
//           value: `${sourceNodeId}[]`,
//           label: `${sourceInfo.toolId}[] (array element)`,
//           type: 'unknown',
//           description: `Array element from ${sourceInfo.toolId}`
//         });
//       }
      
//       // Also add option for the complete array
//       options.push({
//         value: sourceNodeId,
//         label: `${sourceInfo.toolId} (complete array)`,
//         type: 'array',
//         description: `Complete array output from ${sourceInfo.toolId}`
//       });
//     } else {
//       // For non-array sources, use existing logic
//       if (sourceInfo.outputFields.length > 1) {
//         sourceInfo.outputFields.forEach(field => {
//           options.push({
//             value: `${sourceNodeId}.${field.name}`,
//             label: `${sourceInfo.toolId}: ${field.name}`,
//             type: field.type,
//             description: field.description || `${field.name} from ${sourceInfo.toolId}`
//           });
//         });
        
//         // Also add the whole object option
//         options.push({
//           value: sourceNodeId,
//           label: `${sourceInfo.toolId} (complete output)`,
//           type: 'object',
//           description: `Complete output object from ${sourceInfo.toolId}`
//         });
//       } else {
//         // For tools with a single output field, the tool returns that value directly
//         const field = sourceInfo.outputFields[0];
//         options.push({
//           value: sourceNodeId,
//           label: `${sourceInfo.toolId}: ${field.name}`,
//           type: field.type,
//           description: field.description || `Output from ${sourceInfo.toolId}`
//         });
//       }
//     }
//   });

//   return options;
// }