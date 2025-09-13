"use client"

import type React from "react"
import CryptoJS from 'crypto-js'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Package, CreditCard, Download, ExternalLink, Wrench, Clock, Shield, AlertCircle } from "lucide-react"

// Configuration for InPost API (Test Environment)
const API_CONFIG = {
  API_TOKEN:
    "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJkVzROZW9TeXk0OHpCOHg4emdZX2t5dFNiWHY3blZ0eFVGVFpzWV9TUFA4In0.eyJleHAiOjIwNTc5NTk5MTcsImlhdCI6MTc0MjU5OTkxNywianRpIjoiOGZjMWZiNmQtNTJkOS00ZDNkLTkxZWQtNTA1YTU3MGNmODA3IiwiaXNzIjoiaHR0cHM6Ly9zYW5kYm94LWxvZ2luLmlucG9zdC5wbC9hdXRoL3JlYWxtcy9leHRlcm5hbCIsInN1YiI6ImY6N2ZiZjQxYmEtYTEzZC00MGQzLTk1ZjYtOThhMmIxYmFlNjdiOjR2UlJaSDZHNW1LUWdTa2FQXy0yWFVKd19pT0hvTUIwMDF1aGE4SE5aVzAiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzaGlweCIsInNlc3Npb25fc3RhdGUiOiI0NzI1NjUwMi04NjIzLTQ2YmUtOTRmOC02NTA0YzZmNjk2MTMiLCJzY29wZSI6Im9wZW5pZCBhcGk6YXBpcG9pbnRzIGFwaTpzaGlweCIsInNpZCI6IjQ3MjU2NTAyLTg2MjMtNDZiZS05NGY4LTY1MDRjNmY2OTYxMyIsImFsbG93ZWRfcmVmZXJyZXJzIjoiIiwidXVpZCI6IjMxNzAwYmU3LTA2ZTAtNGVkZC05NTA1LTAzZjJhZjQ3M2QwMiIsImVtYWlsIjoia29udGFrdEBwaWNhYmVsYS5wbCJ9.gi0k1iTptAMC0iAILF9hfU5QsM3xClD59XcAs4Dax7FfGmoQTBlnsirBRO6bdVsAEaAN7eXB6kVzIc2om5bFocK8Xtk_z5ih9Piu-PmLKFp9FABmO1KUbq6ZprKBgZvHGEv01IIAgUvqKWfs_PldlCwwj9pBSjgp5IlGHiO0_xRX0kQiAd6RfIWLYuUi_zjTVltv1jS0eJ_eVmA2TOzxb2UF7mZrEpsIcoWbi_yba9g2GgJ46VxrRDI998TgBENPpMLFOECoG_-y60PF2nSU9Bl92qu0e6knxs_DxNYk_dScM0KKT842MorbniHGXcN-V8AfZzgvV1pxDLeqpb1IGA",
  ORGANIZATION_ID: "5134",
  API_BASE_URL: "https://sandbox-api-shipx-pl.easypack24.net/v1",
  RECIPIENT_DATA: {
    name: "Serwis Napraw",
    email: "kontakt@picabela.pl",
    phone: "+48123456789",
    target_paczkomat: "KRA010",
  },
}

// Przelewy24 Sandbox Configuration
const PRZELEWY24_CONFIG = {
  MERCHANT_ID: "2f3a3d13",
  POS_ID: "2f3a3d13", 
  CRC_KEY: "44d745ef276a93e3",
  API_KEY: "404d485c25c140efee92436763a3f0e5",
  SANDBOX_URL: "https://sandbox.przelewy24.pl",
  RETURN_URL: typeof window !== 'undefined' ? `${window.location.origin}/payment-return` : '',
  STATUS_URL: typeof window !== 'undefined' ? `${window.location.origin}/api/payment-status` : ''
}

type FormStep = "form" | "payment" | "success" | "error"

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  description: string
  returnPaczkomat: string
}

interface ShipmentData {
  id: string
  tracking_number?: string
}

interface PaymentData {
  token?: string
  orderId?: string
  sessionId?: string
}

export default function RepairOrderForm() {
  const [currentStep, setCurrentStep] = useState<FormStep>("form")
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    description: "",
    returnPaczkomat: "",
  })
  const [shipmentData, setShipmentData] = useState<ShipmentData | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [error, setError] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)

  const SERVICE_PRICE = 99 // 99 zł brutto

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Generate MD5 hash for Przelewy24 signature
  const generateMD5 = (text: string): string => {
    return CryptoJS.MD5(text).toString()
  }

  const registerPayment = async () => {
    const sessionId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const amount = SERVICE_PRICE * 100 // Convert to grosze (cents)
    
    // Generate signature for Przelewy24
    const signString = `${sessionId}|${PRZELEWY24_CONFIG.MERCHANT_ID}|${amount}|PLN|${PRZELEWY24_CONFIG.CRC_KEY}`
    const sign = generateMD5(signString)
    
    console.log('Payment registration data:', {
      sessionId,
      amount,
      signString,
      sign,
      email: formData.email
    })

    const paymentPayload = {
      merchantId: parseInt(PRZELEWY24_CONFIG.MERCHANT_ID, 16),
      posId: parseInt(PRZELEWY24_CONFIG.POS_ID, 16),
      sessionId: sessionId,
      amount: amount,
      currency: "PLN",
      description: "Naprawa obuwia - Serwis Napraw",
      email: formData.email,
      country: "PL",
      language: "pl",
      urlReturn: PRZELEWY24_CONFIG.RETURN_URL,
      urlStatus: PRZELEWY24_CONFIG.STATUS_URL,
      sign: sign,
      encoding: "UTF-8"
    }

    try {
      const response = await fetch('/api/register-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Payment registration failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        })
        throw new Error(`Błąd podczas rejestracji płatności: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('Payment registration success:', result)
      return result
    } catch (error) {
      console.error('Payment registration error:', error)
      throw error
    }
  }

  const createShipment = async () => {
    const payload = {
      receiver: {
        name: API_CONFIG.RECIPIENT_DATA.name,
        email: API_CONFIG.RECIPIENT_DATA.email,
        phone: API_CONFIG.RECIPIENT_DATA.phone,
        company_name: API_CONFIG.RECIPIENT_DATA.name,
      },
      sender: {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        company_name: `${formData.firstName} ${formData.lastName}`,
      },
      parcels: [
        {
          template: "small",
        },
      ],
      service: "inpost_locker_standard",
      custom_attributes: {
        target_point: API_CONFIG.RECIPIENT_DATA.target_paczkomat,
        sending_method: "parcel_locker",
      },
    }

    try {
      const response = await fetch(`${API_CONFIG.API_BASE_URL}/organizations/${API_CONFIG.ORGANIZATION_ID}/shipments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_CONFIG.API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Błąd podczas tworzenia przesyłki")
      }

      const shipment = await response.json()
      return shipment
    } catch (error) {
      console.error("Error creating shipment:", error)
      throw error
    }
  }

  const getShipmentDetails = async (shipmentId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.API_BASE_URL}/shipments/${shipmentId}`, {
        headers: {
          Authorization: `Bearer ${API_CONFIG.API_TOKEN}`,
        },
      })

      if (!response.ok) {
        throw new Error("Błąd podczas pobierania szczegółów przesyłki")
      }

      return await response.json()
    } catch (error) {
      console.error("Error getting shipment details:", error)
      throw error
    }
  }

  const downloadLabel = async (shipmentId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.API_BASE_URL}/shipments/${shipmentId}/label`, {
        headers: {
          Authorization: `Bearer ${API_CONFIG.API_TOKEN}`,
        },
      })

      if (!response.ok) {
        throw new Error("Błąd podczas pobierania etykiety")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `etykieta-${shipmentId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading label:", error)
      alert("Błąd podczas pobierania etykiety")
    }
  }

  const pollForTrackingNumber = (shipmentId: string) => {
    const interval = setInterval(async () => {
      try {
        const details = await getShipmentDetails(shipmentId)
        if (details.tracking_number) {
          setShipmentData((prev) => (prev ? { ...prev, tracking_number: details.tracking_number } : null))
          clearInterval(interval)
        }
      } catch (error) {
        console.error("Error polling for tracking number:", error)
        clearInterval(interval)
      }
    }, 3000)

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(interval), 120000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.phone ||
      !formData.returnPaczkomat
    ) {
      setError("Proszę wypełnić wszystkie wymagane pola")
      return
    }

    setIsProcessing(true)
    setError("")

    // Store form data in localStorage for use after payment
    localStorage.setItem('repairFormData', JSON.stringify(formData))

    try {
      // Register payment with Przelewy24
      const paymentResult = await registerPayment()
      
      if (paymentResult.token) {
        // Store payment data
        setPaymentData({
          token: paymentResult.token,
          sessionId: paymentResult.sessionId
        })

        // Redirect to Przelewy24 payment page
        const paymentUrl = `${PRZELEWY24_CONFIG.SANDBOX_URL}/trnRequest/${paymentResult.token}`
        window.location.href = paymentUrl
      } else {
        throw new Error('Nie otrzymano tokenu płatności')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Wystąpił błąd podczas inicjowania płatności")
      setIsProcessing(false)
    }
  }

  // Handle payment return (this would be called from a separate page/route)
  const handlePaymentReturn = async (paymentStatus: 'success' | 'error') => {
    if (paymentStatus === 'success') {
      setCurrentStep("payment")
      setIsProcessing(true)

      try {
        // Create shipment after successful payment
        const shipment = await createShipment()
        setShipmentData(shipment)
        setCurrentStep("success")

        // Start polling for tracking number
        pollForTrackingNumber(shipment.id)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Wystąpił błąd podczas tworzenia przesyłki")
        setCurrentStep("error")
      } finally {
        setIsProcessing(false)
      }
    } else {
      setError("Płatność została anulowana lub wystąpił błąd")
      setCurrentStep("error")
    }
  }

  const resetForm = () => {
    setCurrentStep("form")
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      description: "",
      returnPaczkomat: "",
    })
    setShipmentData(null)
    setPaymentData(null)
    setError("")
  }

  if (currentStep === "payment") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-amber-900">Przetwarzanie zamówienia</CardTitle>
            <CardDescription>Płatność została zrealizowana, generujemy etykietę nadawczą...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin mx-auto w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full mb-4"></div>
            <p className="text-sm text-muted-foreground">Tworzenie przesyłki InPost</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentStep === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Zamówienie zrealizowane!</CardTitle>
            <CardDescription>Płatność została przyjęta i przesyłka została utworzona</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-amber-900">Szczegóły przesyłki:</h4>
              <p className="text-sm text-amber-800">ID: {shipmentData?.id}</p>
              {shipmentData?.tracking_number ? (
                <div className="mt-2">
                  <p className="text-sm font-medium text-amber-900">Numer śledzenia:</p>
                  <a
                    href={`https://inpost.pl/sledzenie-przesylek?number=${shipmentData.tracking_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1 text-sm"
                  >
                    {shipmentData.tracking_number}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-amber-700 mt-2">Numer śledzenia będzie dostępny za kilka minut...</p>
              )}
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-amber-900 mb-1">Instrukcje wysyłki:</h4>
                  <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                    <li>Pobierz i wydrukuj etykietę nadawczą</li>
                    <li>Naklej etykietę na paczkę z przedmiotem do naprawy</li>
                    <li>Nadaj paczkę w dowolnym punkcie InPost</li>
                    <li>Naprawiony przedmiot otrzymasz w paczkomacie: <strong>{formData.returnPaczkomat}</strong></li>
                  </ol>
                </div>
              </div>
            </div>

            <Button onClick={() => shipmentData && downloadLabel(shipmentData.id)} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700" variant="default">
              <Download className="w-4 h-4 mr-2" />
              Pobierz etykietę nadawczą (PDF)
            </Button>

            <Button onClick={resetForm} className="w-full" variant="outline">
              Złóż kolejne zamówienie
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentStep === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Wystąpił błąd</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={resetForm} className="w-full">
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-6 h-6 text-amber-600" />
              <h1 className="text-xl font-bold text-foreground">Serwis Napraw</h1>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Strona główna
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Usługi
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Kontakt
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4 text-balance">Zamów naprawę swojego obuwia</h2>
            <p className="text-muted-foreground text-lg text-pretty">
              Profesjonalne usługi naprawcze z wygodną wysyłką przez Paczkomaty InPost
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-amber-200">
              <Shield className="w-8 h-8 text-amber-600" />
              <div>
                <h3 className="font-medium text-sm text-amber-900">Gwarancja jakości</h3>
                <p className="text-xs text-amber-700">6 miesięcy gwarancji</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-amber-200">
              <Clock className="w-8 h-8 text-amber-600" />
              <div>
                <h3 className="font-medium text-sm text-amber-900">Szybka realizacja</h3>
                <p className="text-xs text-amber-700">3-5 dni roboczych</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-amber-200">
              <Package className="w-8 h-8 text-amber-600" />
              <div>
                <h3 className="font-medium text-sm text-amber-900">Wygodna wysyłka</h3>
                <p className="text-xs text-amber-700">Paczkomaty InPost</p>
              </div>
            </div>
          </div>

          {/* Order Form */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-900">Formularz zamówienia</CardTitle>
              <CardDescription>Wypełnij formularz, aby zamówić usługę naprawczą</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-amber-900">Dane kontaktowe</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Imię *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        placeholder="Wprowadź imię"
                        required
                        className="border-amber-200 focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nazwisko *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        placeholder="Wprowadź nazwisko"
                        required
                        className="border-amber-200 focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="twoj@email.pl"
                        required
                        className="border-amber-200 focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="+48 123 456 789"
                        required
                        className="border-amber-200 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-amber-200" />

                {/* Service Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-amber-900">Informacje o usłudze</h3>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-amber-900">Naprawa obuwia</h4>
                        <p className="text-sm text-amber-700">Profesjonalna naprawa wszystkich rodzajów obuwia</p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200">
                        99 zł brutto
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Opis problemu</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Opisz szczegółowo problem z obuwiem..."
                      rows={3}
                      className="border-amber-200 focus:border-amber-500"
                    />
                  </div>
                </div>

                <Separator className="bg-amber-200" />

                {/* Shipping Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-amber-900">Wysyłka zwrotna</h3>
                  <div className="space-y-2">
                    <Label htmlFor="returnPaczkomat">Paczkomat odbioru *</Label>
                    <Input
                      id="returnPaczkomat"
                      value={formData.returnPaczkomat}
                      onChange={(e) => handleInputChange("returnPaczkomat", e.target.value)}
                      placeholder="np. KRA010"
                      required
                      className="border-amber-200 focus:border-amber-500"
                    />
                    <p className="text-xs text-muted-foreground">
                      Podaj kod Paczkomatu, do którego chcesz otrzymać naprawione obuwie
                    </p>
                  </div>
                </div>

                {/* Order Summary */}
                <Separator className="bg-amber-200" />
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-lg">
                  <h3 className="font-medium mb-4 text-amber-900">Podsumowanie zamówienia</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-amber-800">Naprawa obuwia</span>
                    <span className="font-semibold text-lg text-amber-900">99 zł brutto</span>
                  </div>
                  <div className="text-xs text-amber-700 mt-3 p-3 bg-amber-100 rounded border border-amber-200">
                    <strong>Uwaga:</strong> Cena może ulec zmianie po ocenie obuwia przez naszego specjalistę
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold" 
                  size="lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-white/20 border-t-white rounded-full"></div>
                      Przekierowanie do płatności...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Opłać zamówienie 99 zł - Przelewy24
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 Serwis Napraw. Wszystkie prawa zastrzeżone.</p>
            <div className="flex justify-center gap-4 mt-2">
              <a href="#" className="hover:text-foreground">
                Polityka prywatności
              </a>
              <a href="#" className="hover:text-foreground">
                Regulamin
              </a>
              <a href="#" className="hover:text-foreground">
                Kontakt
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}