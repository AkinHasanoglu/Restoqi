import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Text,
} from '@react-email/components'
import * as React from 'react'
import { EmailHeader } from '../components/email-header'
import { EmailFooter } from '../components/email-footer'

interface WelcomeEmailProps {
  userName?: string
  dashboardUrl: string
  logoUrl?: string
  companyAddress?: string
}

export function WelcomeEmail({
  userName = 'there',
  dashboardUrl = 'https://app.example.com',
  logoUrl,
  companyAddress,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to StockAlert — your inventory intelligence platform</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader logoUrl={logoUrl} />
          <Heading style={h1}>Welcome to StockAlert 👋</Heading>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            You&apos;re all set. Connect your first store and create alert rules to start
            monitoring your inventory in real time.
          </Text>
          <Link href={dashboardUrl} style={button}>Get started →</Link>
          <Hr style={hr} />
          <EmailFooter footerText="StockAlert — Inventory alerts for e-commerce sellers" companyAddress={companyAddress} />
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', maxWidth: '580px' }
const h1 = { color: '#333', fontSize: '24px', fontWeight: '700', padding: '0 48px' }
const text = { color: '#333', fontSize: '16px', lineHeight: '26px', padding: '0 48px' }
const button = { backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', display: 'inline-block', fontSize: '14px', fontWeight: '600', padding: '12px 24px', textDecoration: 'none', margin: '16px 48px' }
const hr = { borderColor: '#e6ebf1', margin: '20px 48px' }
