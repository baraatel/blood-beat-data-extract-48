
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2, Eye, X } from 'lucide-react';

export interface ProcessingItem {
  id: string;
  fileName: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  progress: number;
  message: string;
  error?: string;
  imageUrl?: string;
}

interface ProcessingModalProps {
  isOpen: boolean;
  items: ProcessingItem[];
  currentIndex: number;
  totalItems: number;
  onCancel: () => void;
  onViewImage: (imageUrl: string, fileName: string) => void;
}

const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  items,
  currentIndex,
  totalItems,
  onCancel,
  onViewImage
}) => {
  const overallProgress = totalItems > 0 ? ((currentIndex / totalItems) * 100) : 0;
  const completedItems = items.filter(item => item.status === 'complete').length;
  const failedItems = items.filter(item => item.status === 'failed').length;

  const getStatusIcon = (status: ProcessingItem['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 md:h-5 md:w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-4 w-4 md:h-5 md:w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: ProcessingItem['status']) => {
    switch (status) {
      case 'complete':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'processing':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-hidden mx-auto">
        <DialogHeader className="pb-2 md:pb-4">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-red-800 text-lg md:text-xl">Processing Blood Pressure Images</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="border-red-200 text-red-600 hover:bg-red-50 self-start sm:self-auto"
            >
              <X className="h-4 w-4 mr-1 sm:mr-2" />
              Cancel
            </Button>
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Processing your blood pressure images with AI to extract readings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Overall Progress</span>
              <span className="text-gray-600">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-gray-500 gap-1">
              <span>{currentIndex} of {totalItems} processed</span>
              <span>{completedItems} successful, {failedItems} failed</span>
            </div>
          </div>

          {/* Processing Items */}
          <div className="space-y-2 md:space-y-3 max-h-60 md:max-h-96 overflow-y-auto">
            {items.map((item) => (
              <Card key={item.id} className={`${getStatusColor(item.status)} transition-all duration-200`}>
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2 md:space-x-3 flex-1 min-w-0">
                      <div className="mt-0.5">
                        {getStatusIcon(item.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.fileName}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {item.message}
                        </p>
                        {item.error && (
                          <p className="text-xs text-red-600 mt-1 line-clamp-2">
                            Error: {item.error}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                      {item.status === 'processing' && (
                        <div className="text-xs text-blue-600 font-medium">
                          {item.progress}%
                        </div>
                      )}
                      {item.imageUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewImage(item.imageUrl!, item.fileName)}
                          className="h-7 w-7 md:h-8 md:w-8 p-0"
                        >
                          <Eye className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {item.status === 'processing' && (
                    <Progress value={item.progress} className="h-1 mt-2" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Processing Stats */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 pt-3 md:pt-4 border-t">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-blue-600">{totalItems}</div>
              <div className="text-xs text-gray-500">Total Images</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-green-600">{completedItems}</div>
              <div className="text-xs text-gray-500">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-red-600">{failedItems}</div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessingModal;
