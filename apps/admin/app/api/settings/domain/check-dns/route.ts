import { NextResponse } from 'next/server';
import dns from 'node:dns/promises';

import { getSiteSetting, setSiteSetting, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { withPermissionRoute } from '@/shared/api/withAdminRouteScope';
import type { DnsCheckResult } from '@/features/site-settings/model/settingsSchemas';

export const POST = withPermissionRoute(
  'settings',
  'read',
  async (_request, ctx) => {
    try {
      const domain = await getSiteSetting('SITE_DOMAIN');
      if (!domain) {
        return NextResponse.json(
          {
            success: false,
            error: '설정된 도메인이 없습니다.',
          } satisfies ApiResponse<never>,
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

      logAuditEvent({
        action: 'UPDATE',
        entityType: 'SITE_SETTINGS',
        entityId: 'SITE_DOMAIN_VERIFIED',
        entityTitle: 'DNS 검증',
        changes: { after: { domain, verified: String(verified) } },
        userId: ctx.user.id,
        ipAddress: ctx.auditCtx.ipAddress,
        userAgent: ctx.auditCtx.userAgent,
      });

      const data: DnsCheckResult = {
        verified,
        checkedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        data,
      } satisfies ApiResponse<DnsCheckResult>);
    } catch (err) {
      console.error('[Settings DNS Check] Unexpected error:', err);
      return NextResponse.json(
        {
          success: false,
          error: 'DNS 검증에 실패했습니다.',
        } satisfies ApiResponse<never>,
        { status: 500 },
      );
    }
  },
);
