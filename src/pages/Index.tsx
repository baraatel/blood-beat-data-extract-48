import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Heart, Activity, Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';
import DataTable from '@/components/DataTable';

import ProcessingModal, { ProcessingItem } from '@/components/ProcessingModal';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import { processImageWithAIDirect } from '@/services/aiService';

export interface BloodPressureData {
  id: string;
  day: number;
  month: number;
  time: string;
  period: string;
  sys: number;
  dia: number;
  pulse: number;
  imageUrl: string;
  processed: boolean;
}

const Index = () => {
  const [data, setData] = useState<BloodPressureData[]>([]);
  const [processing, setProcessing] = useState(false);
  
  const [processingItems, setProcessingItems] = useState<ProcessingItem[]>([]);
  const [currentProcessingIndex, setCurrProcessingIndex] = useState(0);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{url: string, name: string} | null>(null);
  const { toast } = useToast();

  const handleImageUpload = async (files: File[]) => {
    setProcessing(true);
    setShowProcessingModal(true);
    setCurrProcessingIndex(0);

    // Initialize processing items
    const items: ProcessingItem[] = files.map((file, index) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      status: 'queued',
      progress: 0,
      message: 'Waiting to process...',
      imageUrl: URL.createObjectURL(file)
    }));

    setProcessingItems(items);
    const newData: BloodPressureData[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const itemId = items[i].id;
        
        setCurrProcessingIndex(i + 1);
        
        // Update item status to processing
        setProcessingItems(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, status: 'processing' as const, message: 'Starting AI analysis...', progress: 10 }
              : item
          )
        );

        try {
          const imageUrl = URL.createObjectURL(file);
          
          const extractedData = await processImageWithAIDirect(file, (status) => {
            setProcessingItems(prev => 
              prev.map(item => 
                item.id === itemId 
                  ? { ...item, message: status, progress: Math.min(90, item.progress + 20) }
                  : item
              )
            );
          });
          
          // Update item to complete
          setProcessingItems(prev => 
            prev.map(item => 
              item.id === itemId 
                ? { 
                    ...item, 
                    status: 'complete' as const, 
                    message: 'Successfully extracted data', 
                    progress: 100 
                  }
                : item
            )
          );

          newData.push({
            id: crypto.randomUUID(),
            ...extractedData,
            imageUrl,
            processed: true
          });

        } catch (error) {
          console.error('Error processing image:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          
          // Update item to failed
          setProcessingItems(prev => 
            prev.map(item => 
              item.id === itemId 
                ? { 
                    ...item, 
                    status: 'failed' as const, 
                    message: 'Processing failed', 
                    progress: 100,
                    error: errorMessage
                  }
                : item
            )
          );

          // Add failed entry for manual editing
          newData.push({
            id: crypto.randomUUID(),
            day: 0,
            month: 0,
            time: '',
            period: '',
            sys: 0,
            dia: 0,
            pulse: 0,
            imageUrl: URL.createObjectURL(file),
            processed: false
          });
        }

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setData(prev => [...prev, ...newData]);
      
      const successCount = newData.filter(d => d.processed).length;
      const failCount = files.length - successCount;

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${successCount} out of ${files.length} images. ${failCount > 0 ? `${failCount} failed and need manual entry.` : ''}`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      // Auto-close modal after a delay
      setTimeout(() => {
        setShowProcessingModal(false);
      }, 2000);

    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process images. Please try again shortly.",
        variant: "destructive"
      });
      setShowProcessingModal(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelProcessing = () => {
    setProcessing(false);
    setShowProcessingModal(false);
    toast({
      title: "Processing Cancelled",
      description: "Image processing has been cancelled.",
    });
  };

  const handleViewImage = (imageUrl: string, fileName: string) => {
    setPreviewImage({ url: imageUrl, name: fileName });
  };

  const updateData = (id: string, updatedItem: BloodPressureData) => {
    setData(prev => prev.map(item => item.id === id ? updatedItem : item));
  };

  const deleteData = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
  };

  const exportData = (format: 'csv' | 'excel') => {
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "Please process some images first before exporting.",
        variant: "destructive"
      });
      return;
    }

    const headers = ['Day', 'Month', 'Time', 'PM-AM', 'SYS', 'DIA', 'Pulse'];
    const csvContent = [
      headers.join(','),
      ...data.map(item => 
        [item.day, item.month, item.time, item.period, item.sys, item.dia, item.pulse].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `blood_pressure_data.${format === 'excel' ? 'csv' : 'csv'}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Data exported as ${format.toUpperCase()} file.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50">
      {/* Header - Mobile Responsive */}
      <div className="bg-white shadow-sm border-b border-red-100">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-500 rounded-lg flex-shrink-0">
                <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">BP Monitor Data Extractor</h1>
                <p className="text-red-600 font-medium text-sm sm:text-base">Citizen LCD Blood Pressure Monitor</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Upload Section */}
        <Card className="border-red-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
            <CardTitle className="flex items-center text-lg sm:text-xl">
              <Upload className="h-5 w-5 mr-2" />
              Upload Blood Pressure Monitor Images
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ImageUpload onUpload={handleImageUpload} processing={processing} />
          </CardContent>
        </Card>

        {/* Stats Cards - Mobile Responsive Grid */}
        {data.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{data.length}</div>
                <div className="text-xs sm:text-sm text-green-800">Total Readings</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {data.filter(d => d.processed).length}
                </div>
                <div className="text-xs sm:text-sm text-blue-800">Successfully Processed</div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-purple-600">
                  {data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.sys, 0) / data.length) : 0}
                </div>
                <div className="text-xs sm:text-sm text-purple-800">Avg Systolic</div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-600">
                  {data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.pulse, 0) / data.length) : 0}
                </div>
                <div className="text-xs sm:text-sm text-orange-800">Avg Pulse</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Table - Mobile Responsive */}
        {data.length > 0 && (
          <Card className="border-red-200 shadow-lg">
            <CardHeader className="bg-red-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <CardTitle className="text-red-800 flex items-center text-lg sm:text-xl">
                <Activity className="h-5 w-5 mr-2" />
                Extracted Data ({data.length} readings)
              </CardTitle>
              {/* Mobile Responsive Export Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => exportData('csv')}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 w-full sm:w-auto min-h-[44px] sm:min-h-0"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  onClick={() => exportData('excel')}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 w-full sm:w-auto min-h-[44px] sm:min-h-0"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 px-3 sm:px-6">
              <DataTable 
                data={data} 
                onUpdate={updateData} 
                onDelete={deleteData}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={showProcessingModal}
        items={processingItems}
        currentIndex={currentProcessingIndex}
        totalItems={processingItems.length}
        onCancel={handleCancelProcessing}
        onViewImage={handleViewImage}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        imageUrl={previewImage?.url || ''}
        fileName={previewImage?.name || ''}
        onClose={() => setPreviewImage(null)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-red-100 mt-16">
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-red-600">
              <Heart className="h-5 w-5 fill-current" />
              <span className="font-medium text-sm sm:text-base">Built with ❤️ by Dr. Bara Sadeq</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">President of JDA IT Committee</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
