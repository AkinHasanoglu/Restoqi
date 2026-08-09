import {
  Body, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import * as React from 'react'

interface InviteEmailProps {
  inviterName: string
  teamName: string
  role: string
  acceptUrl: string
}

export function InviteEmail({
  inviterName = 'Someone',
  teamName = 'My Team',
  role = 'member',
  acceptUrl = 'https://app.example.com/accept-invite',
}: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} invited you to join {teamName} on StockAlert</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You&apos;ve been invited</Heading>
          <Text style={text}>
            <strong>{inviterName}</strong> has invited you to join{' '}
            <strong>{teamName}</strong> as a <strong>{role}</strong>.
          </Text>
          <Link href={acceptUrl} style={button}>Accept invitation →</Link>
          <Text style={footer}>This invitation expires in 7 days.</Text>
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
const footer = { color: '#8898aa', fontSize: '12px', padding: '0 48px' }
