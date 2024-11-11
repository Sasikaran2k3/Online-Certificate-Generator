"use client"
import React, { useState, useRef, useEffect, ReactNode } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { init } from 'next/dist/compiled/webpack/webpack'
import dynamic from 'next/dynamic';

// Dynamically import html2canvas to avoid SSR issues
const html2canvas = dynamic(() => import('html2canvas'), { ssr: false });

export default function CertificateGenerator() {
  const [step, setStep] = useState(1)
  const [generationType, setGenerationType] = useState("single")
  const [template, setTemplate] = useState(null)
  const [name, setName] = useState("")
  const [excelData, setExcelData] = useState(null)
  const [selectedColumn, setSelectedColumn] = useState("")
  const [textBoxes, setTextBoxes] = useState([])
  const [currentTextBox, setCurrentTextBox] = useState(null)
  const [textColor, setTextColor] = useState("#000000")
  const [fontFamily, setFontFamily] = useState("Arial")
  const [fontSize, setFontSize] = useState(24)
  const [isDragging, setIsDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement | null >(null)
  const canvasRefPreview = useRef<HTMLCanvasElement | null >(null)

  useEffect(() => {
    const canvas = canvasRefPreview.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Initial background for the canvas (e.g., light gray)
        ctx.fillStyle = "#f0f0f0"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [])
  
  useEffect(()=>{
    if(template) {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        const canvasPreview = canvasRefPreview.current
        console.log(canvas)
        if (canvas) {
          const ctx = canvas.getContext('2d')
          canvas.width = img.width
          canvas.height = img.height
          if (ctx) {
            ctx.drawImage(img, 0, 0);
          }
        }
        if (canvasPreview) {
          const ctx = canvasPreview.getContext('2d')
          if (ctx) {
            console.log("canvas")
            ctx.drawImage(img, 0, 0, canvasPreview.width, canvasPreview.height);
          }
        }
      }
      img.src = URL.createObjectURL(template)
    }
},[template, step])
useEffect(() => {
  if (currentTextBox) {
    const updatedTextBox = {
      ...currentTextBox,
      color: textColor,
      fontFamily: fontFamily,
      fontSize: fontSize
    };
    setTextBoxes((prevTextBoxes) =>
      prevTextBoxes.map((tb) =>
        tb.id === currentTextBox.id ? updatedTextBox : tb
      )
    );
    setCurrentTextBox(updatedTextBox);
  }
}, [textColor, fontFamily, fontSize]);

  const handleTemplateUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setTemplate(file)
      
    }
  }

  const handleExcelUpload = (e) => {
    // Excel file handling logic here
    setStep(3)
  }

  const addTextBox = () => {
    const canvas = canvasRef.current;
    const centerX = canvas ? canvas.width / 2 : 100;
    const centerY = canvas ? canvas.height / 2 : 100;
    const newTextBox = {
      id: Date.now(),
      text: generationType === 'single' ? name : 'Sample Text',
      x: centerX - 100, // Center horizontally
      y: centerY - 25, // Center vertically
      width: 200,
      height: 50,
      color: textColor,
      fontFamily,
      fontSize
    }
    setTextBoxes([...textBoxes, newTextBox])
    setCurrentTextBox(newTextBox)    
  }

  
  const handleTextBoxClick  = (textBox, e) => {
    setCurrentTextBox(textBox)
    setIsDragging(true)
    setOffset({
      x: e.clientX - textBox.x,
      y: e.clientY - textBox.y
    })
  }

  const handleMouseMove = (e) => {
    if (isDragging && currentTextBox) {
      const updatedTextBoxes = textBoxes.map(tb => 
        tb.id === currentTextBox.id
          ? { ...tb, x: e.clientX - offset.x, y: e.clientY - offset.y }
          : tb
      )
      setTextBoxes(updatedTextBoxes)
    }
  }
  const handleMouseUp = () => {
    setIsDragging(false)
  }


  const generateCertificates = async (flag) => {
    // Show the loading spinner or message
    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    // Create a new JSZip instance for storing bulk certificates if needed
    const zip = new JSZip();
    const container = flag === 0 ? document.getElementById('bulk-form').querySelector('.canvas-container') : document.querySelector('.canvas-container');
    selectedColumn = flag === 0 ? document.getElementById('bulk-form').querySelector('#columnSelect').value : document.getElementById('columnSelect').value;

    // Function to remove borders and handles before generating certificates
    const prepareTextBoxesForGeneration = () => {
        textBoxes.forEach(box => {
            box.style.border = 'none';
            box.style.backgroundColor = 'transparent';
            box.querySelectorAll('.resize-handle').forEach(handle => {
                handle.style.display = 'none';
            });
        });
    };

    // Function to restore borders and handles after generation
    const restoreTextBoxesUI = () => {
        textBoxes.forEach(box => {
            box.style.border = '1px solid #000';
            box.style.backgroundColor = 'rgba(255,255,255,0.7)';
            box.querySelectorAll('.resize-handle').forEach(handle => {
                handle.style.display = 'block';
            });
        });
    };

    try {
        if (flag === 1) { // Single certificate generation
            textBoxes.forEach(box => {
                box.textContent = document.getElementById("userInput").value;
                box.style.color = document.getElementById('colorPicker').value;
                box.style.fontFamily = document.getElementById('fontSelect').value;
                box.style.fontSize = document.getElementById('fontSize').value + 'px';
            });

            prepareTextBoxesForGeneration();

            await new Promise(resolve => setTimeout(resolve, 100));
            const canvas = await html2canvas(container, { 
                useCORS: true, 
                allowTaint: true, 
                backgroundColor: null, 
                scale: 2 
            });
            const dataUrl = canvas.toDataURL('image/png', 1.0);

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'certificate.png';
            link.click();

        } else { // Bulk certificate generation
            prepareTextBoxesForGeneration();

            for (let i = 0; i < data.length; i++) {
                textBoxes.forEach(box => {
                    box.textContent = data[i][selectedColumn];
                    box.style.color = document.getElementById('colorPicker').value;
                    box.style.fontFamily = document.getElementById('fontSelect').value;
                    box.style.fontSize = document.getElementById('fontSize').value + 'px';
                });

                await new Promise(resolve => setTimeout(resolve, 100));

                const canvas = await html2canvas(container, {
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: null,
                    scale: 2,
                    logging: false
                });

                const dataUrl = canvas.toDataURL('image/png', 1.0);
                const base64Data = dataUrl.split(',')[1];
                const fileName = `certificate_${data[i][selectedColumn].replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
                zip.file(fileName, base64Data, {base64: true});

                loading.textContent = `Generating certificates... ${i + 1}/${data.length}`;
            }

            const content = await zip.generateAsync({type: 'blob'});
            saveAs(content, 'certificates.zip');
        }
    } catch (error) {
        console.error('Error generating certificates:', error);
        alert('Error generating certificates. Please try again.');
    } finally {
        restoreTextBoxesUI();
        loading.style.display = 'none';
    }
};


  const handleReset = () => {
    setStep(1)
    setGenerationType("single")
    setTemplate(null)
    setName("")
    setExcelData(null)
    setSelectedColumn("")
    setTextBoxes([])
    setCurrentTextBox(null)
    setTextColor("#000000")
    setFontFamily("Arial")
    setFontSize(24)
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl"
    onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}>
      <h1 className="text-3xl font-bold mb-6 text-center">Certificate Generator</h1>
      
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-1/4 h-2 ${
                s <= step ? 'bg-primary' : 'bg-gray-200'
              } ${s < 4 ? 'mr-1' : ''}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Upload</span>
          <span>Details</span>
          <span>Design</span>
          <span>Generate</span>
        </div>
      </div>

      {step === 1 && (
        <div>
          <canvas ref={canvasRefPreview} className="w-half border" />
          <h2 className="text-xl font-semibold mb-4">Step 1: Upload Certificate Template</h2>
          <Input
            type="file"
            accept="image/*"
            onChange={handleTemplateUpload}
            className="mb-4"
          />
          <RadioGroup
            value={generationType}
            onValueChange={setGenerationType}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single">Single</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bulk" id="bulk" />
              <Label htmlFor="bulk">Bulk</Label>
            </div>
          </RadioGroup>
          <br></br>
          <Button onClick={() => setStep(2)}>Next</Button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 2: Enter Details</h2>
          {generationType === 'single' ? (
            <Input
              type="text"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-4"
            />
          ) : (
            <Input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleExcelUpload}
              className="mb-4"
            />
          )}
          <Button onClick={() => setStep(3)}>Next</Button>
        </div>
      )}

      {step === 3 && (
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 3: Design Certificate</h2>
          <div className="flex space-x-4 mb-4">
            <Input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-12 h-12"
            />
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2 flex-grow">
              <span className="text-sm">Font Size:</span>
              <Slider
                value={[fontSize]}
                onValueChange={(value) => setFontSize(value[0])}
                max={72}
                min={8}
                step={1}
              />
              <span className="text-sm">{fontSize}px</span>
            </div>
            <Button onClick={addTextBox}>Add Text Box</Button>
          </div>
          <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
            <canvas ref={canvasRef} style={{width:'100%', height:'100%'}} />
            {textBoxes.map((textBox) => (
              <div
                key={textBox.id}
                style={{
                  textAlign:'center',
                  position: 'absolute',
                  left: textBox.x,
                  top: textBox.y,
                  width: textBox.width,
                  height: textBox.height,
                  color: textBox.color,
                  fontFamily: textBox.fontFamily,
                  fontSize: `${textBox.fontSize}px`,
                  cursor: 'move',
                  border: currentTextBox?.id === textBox.id ? '2px solid blue' : 'none',
                }}
                onMouseDown={(e) => handleTextBoxClick(textBox, e)}
              >
                {textBox.text}
              </div>
            ))}
          </div>
          <Button onClick={() => setStep(4)}>Next</Button>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 4: Generate Certificates</h2>
          <Button onClick={generateCertificates}>Generate & Download Certificates</Button>
        </div>
      )}
      <div className="mt-8 text-center">
        <Button variant="outline" onClick={handleReset}>Reset</Button>
      </div>
    </div>
  )
}