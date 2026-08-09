import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface LowStockAlertProps {
  productName: string
  storeName: string
  currentQuantity: number
  threshold: number
  productUrl?: string
  dashboardUrl: string
}

export function LowStockAlert({
  productName = 'Product Name',
  storeName = 'My Store',
  currentQuantity = 5,
  threshold = 10,
  productUrl,
  dashboardUrl = 'https://app.example.com',
}: LowStockAlertProps) {
  return (
    <Html>
      <Head />
      <Preview>Low stock alert: {productName} has only {String(currentQuantity)} units remaining</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>⚠️ Low Stock Alert</Heading>
          <Text style={text}>
            <strong>{productName}</strong> in <strong>{storeName}</strong> is running low.
          </Text>
          <Section style={alertBox}>
            <Text style={alertText}>Current quantity: <strong>{String(currentQuantity)}</strong></Text>
            <Text style={alertText}>Threshold: <strong>{String(threshold)}</strong></Text>
          </Section>
          {productUrl && (
            <Text style={text}>
              <Link href={productUrl}>View product →</Link>
            </Text>
          )}
          <Hr style={hr} />
          <Text style={footer}>
            <Link href={dashboardUrl}>Manage your alerts in StockAlert</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', maxWidth: '580px' }
const h1 = { color: '#333', fontSize: '24px', fontWeight: '700', padding: '0 48px' }
const text = { color: '#333', fontSize: '16px', lineHeight: '26px', padding: '0 48px' }
const alertBox = { backgroundColor: '#fff3cd', borderRadius: '8px', margin: '24px 48px', padding: '16px' }
const alertText = { color: '#856404', fontSize: '14px', margin: '0' }
const hr = { borderColor: '#e6ebf1', margin: '20px 48px' }
const footer = { color: '#8898aa', fontSize: '12px', padding: '0 48px' }
