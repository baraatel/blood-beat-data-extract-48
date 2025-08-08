
import React from 'react';
import { Edit, Trash2, Check, X, Heart, AlertCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { BloodPressureData } from '@/pages/Index';

interface MobileDataCardProps {
  item: BloodPressureData;
  isEditing: boolean;
  editData: BloodPressureData | null;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUpdateField: (field: keyof BloodPressureData, value: any) => void;
  onDelete: () => void;
}

const MobileDataCard: React.FC<MobileDataCardProps> = ({
  item,
  isEditing,
  editData,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onUpdateField,
  onDelete
}) => {
  const currentData = isEditing ? editData! : item;
  
  const getBPCategory = (sys: number, dia: number) => {
    if (sys < 120 && dia < 80) return { category: 'Normal', color: 'bg-green-100 text-green-800' };
    if (sys < 130 && dia < 80) return { category: 'Elevated', color: 'bg-yellow-100 text-yellow-800' };
    if (sys < 140 || dia < 90) return { category: 'High Stage 1', color: 'bg-orange-100 text-orange-800' };
    if (sys < 180 || dia < 120) return { category: 'High Stage 2', color: 'bg-red-100 text-red-800' };
    return { category: 'Crisis', color: 'bg-red-200 text-red-900' };
  };

  const bpCategory = getBPCategory(currentData.sys, currentData.dia);

  return (
    <Card className="border-red-200 bg-white shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header with Image and Status */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 h-10 w-10 p-0">
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
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={onSaveEdit}
                  className="bg-green-500 hover:bg-green-600 text-white h-10 w-10 p-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelEdit}
                  className="border-gray-300 h-10 w-10 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onStartEdit}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 h-10 w-10 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDelete}
                  className="border-red-200 text-red-600 hover:bg-red-50 h-10 w-10 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Date</label>
            {isEditing ? (
              <div className="flex space-x-2">
                <Input
                  type="number"
                  value={currentData.day}
                  onChange={(e) => onUpdateField('day', parseInt(e.target.value) || 0)}
                  className="w-16"
                  max="31"
                  min="1"
                  placeholder="Day"
                />
                <Input
                  type="number"
                  value={currentData.month}
                  onChange={(e) => onUpdateField('month', parseInt(e.target.value) || 0)}
                  className="w-16"
                  max="12"
                  min="1"
                  placeholder="Mon"
                />
              </div>
            ) : (
              <div className="text-lg font-medium">{currentData.day}/{currentData.month}</div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Time</label>
            {isEditing ? (
              <div className="flex space-x-2">
                <Input
                  type="time"
                  value={currentData.time}
                  onChange={(e) => onUpdateField('time', e.target.value)}
                  className="flex-1"
                />
                <Select value={currentData.period} onValueChange={(value) => onUpdateField('period', value)}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="font-mono text-lg">{currentData.time}</span>
                <Badge variant="outline" className="border-blue-200 text-blue-700">
                  {currentData.period}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Blood Pressure Values */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">SYS</label>
            {isEditing ? (
              <Input
                type="number"
                value={currentData.sys}
                onChange={(e) => onUpdateField('sys', parseInt(e.target.value) || 0)}
                className="w-full"
              />
            ) : (
              <div className="text-xl font-bold text-red-600">{currentData.sys}</div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">DIA</label>
            {isEditing ? (
              <Input
                type="number"
                value={currentData.dia}
                onChange={(e) => onUpdateField('dia', parseInt(e.target.value) || 0)}
                className="w-full"
              />
            ) : (
              <div className="text-xl font-bold text-blue-600">{currentData.dia}</div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Pulse</label>
            {isEditing ? (
              <Input
                type="number"
                value={currentData.pulse}
                onChange={(e) => onUpdateField('pulse', parseInt(e.target.value) || 0)}
                className="w-full"
              />
            ) : (
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4 text-pink-500 fill-current" />
                <span className="text-xl font-bold text-pink-600">{currentData.pulse}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileDataCard;
