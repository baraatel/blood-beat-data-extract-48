
import React, { useState } from 'react';
import { Eye, Edit, Trash2, Check, X, Heart, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import MobileDataCard from '@/components/MobileDataCard';
import type { BloodPressureData } from '@/pages/Index';

interface DataTableProps {
  data: BloodPressureData[];
  onUpdate: (id: string, updatedItem: BloodPressureData) => void;
  onDelete: (id: string) => void;
}

const DataTable: React.FC<DataTableProps> = ({ data, onUpdate, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<BloodPressureData | null>(null);

  const startEditing = (item: BloodPressureData) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEditing = () => {
    if (editData) {
      onUpdate(editData.id, editData);
      setEditingId(null);
      setEditData(null);
    }
  };

  const updateEditData = (field: keyof BloodPressureData, value: any) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
    }
  };

  const getBPCategory = (sys: number, dia: number) => {
    if (sys < 120 && dia < 80) return { category: 'Normal', color: 'bg-green-100 text-green-800' };
    if (sys < 130 && dia < 80) return { category: 'Elevated', color: 'bg-yellow-100 text-yellow-800' };
    if (sys < 140 || dia < 90) return { category: 'High Stage 1', color: 'bg-orange-100 text-orange-800' };
    if (sys < 180 || dia < 120) return { category: 'High Stage 2', color: 'bg-red-100 text-red-800' };
    return { category: 'Crisis', color: 'bg-red-200 text-red-900' };
  };

  return (
    <>
      {/* Mobile Card Layout - Hidden on Desktop */}
      <div className="space-y-4 lg:hidden">
        {data.map((item) => (
          <MobileDataCard
            key={item.id}
            item={item}
            isEditing={editingId === item.id}
            editData={editData}
            onStartEdit={() => startEditing(item)}
            onCancelEdit={cancelEditing}
            onSaveEdit={saveEditing}
            onUpdateField={updateEditData}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </div>

      {/* Desktop Table Layout - Hidden on Mobile */}
      <div className="hidden lg:block overflow-x-auto">
        <Table className="w-full border-collapse border border-red-200 rounded-lg">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-500">
              <TableHead className="border border-red-300 px-4 py-3 text-left font-semibold text-white">Image</TableHead>
              <TableHead className="border border-red-300 px-4 py-3 text-left font-semibold text-white">Day</TableHead>
              <TableHead className="border border-red-300 px-4 py-3 text-left font-semibold text-white">Month</TableHead>
              <TableHead className="border border-red-300 px-4 py-3 text-left font-semibold text-white">Time</TableHead>
              <TableHead className="border border-red-300 px-4 py-3 text-left font-semibold text-white">Period</TableHead>
              <TableHead className="border border-red-300 px-4 py-3 text-left font-semibold text-white">SYS</TableHead>
              <TableHead className="border border-red-300 px-4 py-3 text-left font-semibold text-white">DIA</TableHead>
              <TableHead className="border border-red-300 px-4 py-3 text-left font-semibold text-white">Pulse</TableHead>
              <TableHead className="border border-red-300 px-4 py-3 text-left font-semibold text-white">Status</TableHead>
              <TableHead className="border border-red-300 px-4 py-3 text-left font-semibold text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => {
              const isEditing = editingId === item.id;
              const currentData = isEditing ? editData! : item;
              const bpCategory = getBPCategory(currentData.sys, currentData.dia);

              return (
                <TableRow key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-red-25'} hover:bg-red-50 transition-colors`}>
                  {/* Image Preview */}
                  <TableCell className="border border-red-200 px-4 py-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Original Image</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center">
                          <img 
                            src={item.imageUrl} 
                            alt="Blood pressure monitor" 
                            className="max-w-full max-h-96 object-contain rounded-lg border"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>

                  {/* Day */}
                  <TableCell className="border border-red-200 px-4 py-3">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={currentData.day}
                        onChange={(e) => updateEditData('day', parseInt(e.target.value) || 0)}
                        className="w-20"
                        max="31"
                        min="1"
                      />
                    ) : (
                      <span className="font-medium">{currentData.day}</span>
                    )}
                  </TableCell>

                  {/* Month */}
                  <TableCell className="border border-red-200 px-4 py-3">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={currentData.month}
                        onChange={(e) => updateEditData('month', parseInt(e.target.value) || 0)}
                        className="w-20"
                        max="12"
                        min="1"
                      />
                    ) : (
                      <span className="font-medium">{currentData.month}</span>
                    )}
                  </TableCell>

                  {/* Time */}
                  <TableCell className="border border-red-200 px-4 py-3">
                    {isEditing ? (
                      <Input
                        type="time"
                        value={currentData.time}
                        onChange={(e) => updateEditData('time', e.target.value)}
                        className="w-24"
                      />
                    ) : (
                      <span className="font-mono">{currentData.time}</span>
                    )}
                  </TableCell>

                  {/* Period */}
                  <TableCell className="border border-red-200 px-4 py-3">
                    {isEditing ? (
                      <Select value={currentData.period} onValueChange={(value) => updateEditData('period', value)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="border-blue-200 text-blue-700">
                        {currentData.period}
                      </Badge>
                    )}
                  </TableCell>

                  {/* SYS */}
                  <TableCell className="border border-red-200 px-4 py-3">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={currentData.sys}
                        onChange={(e) => updateEditData('sys', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    ) : (
                      <span className="font-bold text-red-600">{currentData.sys}</span>
                    )}
                  </TableCell>

                  {/* DIA */}
                  <TableCell className="border border-red-200 px-4 py-3">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={currentData.dia}
                        onChange={(e) => updateEditData('dia', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    ) : (
                      <span className="font-bold text-blue-600">{currentData.dia}</span>
                    )}
                  </TableCell>

                  {/* Pulse */}
                  <TableCell className="border border-red-200 px-4 py-3">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={currentData.pulse}
                        onChange={(e) => updateEditData('pulse', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4 text-pink-500 fill-current" />
                        <span className="font-bold text-pink-600">{currentData.pulse}</span>
                      </div>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="border border-red-200 px-4 py-3">
                    <div className="space-y-1">
                      <Badge className={bpCategory.color}>
                        {bpCategory.category}
                      </Badge>
                      {!item.processed && (
                        <Badge variant="outline" className="border-orange-200 text-orange-700 block">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Manual Entry
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="border border-red-200 px-4 py-3">
                    <div className="flex space-x-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={saveEditing}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            className="border-gray-300"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(item)}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDelete(item.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default DataTable;
