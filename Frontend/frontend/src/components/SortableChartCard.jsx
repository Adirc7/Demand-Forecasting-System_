import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DynamicChartCard from './DynamicChartCard';

export default function SortableChartCard({ chart, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chart.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: 'relative',
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DynamicChartCard 
        chartConfig={chart} 
        onDelete={onDelete} 
        dragHandleProps={{ attributes, listeners }} 
      />
    </div>
  );
}
