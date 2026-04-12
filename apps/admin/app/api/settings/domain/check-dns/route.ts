import { NextResponse } from 'next/server';
import dns from 'node:dns/promises';

import { getSiteSetting, setSiteSetting, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import type { DnsCheckResult } from '@/features/site-settings/model/settingsSchemas';

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('settings', 'read');
  if (error) return error;

  try {
    const domain = await getSiteSetting('SITE_DOMAIN');
    if (!domain) {
      return NextResponse.json(
        { success: false, error: '설정된 도메인이 없습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    let verified = false;

    try {
      const aRecords = await dns.resolve4(domain);
      const expectedIp = process.env.EXPECTED_SERVER_IP;

      if (expectedIp && aRecords.includes(expectedIp)) {
        verified = true;
      }

      if (!verified) {
        try {
          const cnameRecords = await dns.resolveCname(domain);
          const expectedCname = process.env.EXPECTED_SERVER_CNAME;
          if (expectedCname && cnameRecords.includes(expectedCname)) {
            verified = true;
          }
        } catch {
          // CNAME 없으면 A 레코드 결과로 판단
        }
      }
    } catch {
      verified = false;
    }

    await setSiteSetting('SITE_DOMAIN_VERIFIED', String(verified));

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'SITE_SETTINGS',
      entityId: 'SITE_DOMAIN_VERIFIED',
      entityTitle: 'DNS 검증',
      changes: { after: { domain, verified: String(verified) } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    const data: DnsCheckResult = {
      verified,
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<DnsCheckResult>,
    );
  } catch (err) {
    console.error('[Settings DNS Check] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'DNS 검증에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
