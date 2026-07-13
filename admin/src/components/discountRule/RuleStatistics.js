'use client';
import { useState } from 'react';
import { Card, CardBody, CardHeader, Col, Row, Table, Badge, Progress, Spinner, Button } from 'reactstrap';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { RiFileExcel2Line } from 'react-icons/ri';
import request from '@/utils/axiosUtils';
import { DiscountRuleAPI } from '@/utils/axiosUtils/API';
import useCustomQuery from '@/utils/hooks/useCustomQuery';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const RuleStatistics = ({ ruleId, ruleName }) => {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  const { data: stats, isLoading } = useCustomQuery(
    ['discount-rule-statistics', ruleId],
    () => request({ url: `${DiscountRuleAPI}/${ruleId}/statistics` }, router),
    {
      refetchOnWindowFocus: false,
      enabled: !!ruleId,
      select: (res) => res?.data?.data,
    }
  );

  if (isLoading) {
    return (
      <Card className="discount-rule-stats-card">
        <CardBody className="text-center py-5">
          <Spinner color="primary" />
        </CardBody>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="discount-rule-stats-card">
        <CardBody className="text-center py-5 text-muted">
          No statistics available
        </CardBody>
      </Card>
    );
  }

  // Export to Excel using backend API
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const baseUrl = process.env.API_PROD_URL || 'https://api.cuple.shop/api/admin/';
      const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const url = `${normalizedBaseUrl}discount-rule/${ruleId}/statistics/export`;

      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      // Add auth header if available
      const token = localStorage.getItem('uat');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = function () {
        if (xhr.status === 200) {
          const blob = xhr.response;
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;

          // Get filename from Content-Disposition header or use default
          const disposition = xhr.getResponseHeader('Content-Disposition');
          let filename = `discount_rule_${ruleId}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
          if (disposition) {
            const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1].replace(/['"]/g, '');
            }
          }

          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          document.body.removeChild(a);
        } else {
          console.error('Export failed with status:', xhr.status);
          alert('Failed to export report. Please try again.');
        }
        setExporting(false);
      };

      xhr.onerror = function () {
        console.error('Export error');
        alert('Failed to export report. Please try again.');
        setExporting(false);
      };

      xhr.send();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report');
      setExporting(false);
    }
  };

  // Usage progress
  const usagePercent = stats.usage_limit
    ? Math.min((stats.total_uses / stats.usage_limit) * 100, 100)
    : null;

  // Line chart for usage trend
  const trendChartOptions = {
    series: [
      {
        name: 'Uses',
        data: stats.uses_by_day?.map(d => d.count) || [],
      },
      {
        name: 'Discount Amount',
        data: stats.uses_by_day?.map(d => d.total_discount) || [],
      },
    ],
    options: {
      chart: {
        type: 'area',
        height: 200,
        toolbar: { show: false },
        sparkline: { enabled: false },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
        },
      },
      colors: ['#17a2b8', '#D49D67'],
      xaxis: {
        categories: stats.uses_by_day?.map(d => {
          const date = new Date(d.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }) || [],
        labels: { show: true, rotate: -45 },
      },
      yaxis: [
        { title: { text: 'Uses' }, labels: { formatter: (v) => v?.toFixed(0) } },
        { opposite: true, title: { text: 'Discount (AED)' }, labels: { formatter: (v) => v?.toFixed(0) } },
      ],
      legend: { position: 'top' },
      tooltip: { shared: true },
    },
  };

  return (
    <Card className="discount-rule-stats-card">
      <CardHeader className="d-flex justify-content-between align-items-center discount-rule-stats-header">
        <h6 className="mb-0" style={{ color: '#333' }}>Rule Statistics</h6>
        <Button
          color="success"
          size="sm"
          outline
          className="discount-rule-export-btn"
          onClick={exportToExcel}
          disabled={exporting || stats.total_uses === 0}
          title="Export Statistics to Excel"
        >
          <RiFileExcel2Line className="me-1" />
          {exporting ? 'Exporting...' : 'Export Excel'}
        </Button>
      </CardHeader>
      <CardBody>
        {/* Summary Stats */}
        <Row className="discount-rule-stats-grid">
          <Col md="3" className="text-center">
            <h3 style={{ color: '#0d6efd' }} className="mb-1">{stats.total_uses}</h3>
            <small style={{ color: '#6c757d' }}>Total Uses</small>
          </Col>
          <Col md="3" className="text-center">
            <h3 style={{ color: '#198754' }} className="mb-1">{stats.total_discount_given?.toFixed(2)} AED</h3>
            <small style={{ color: '#6c757d' }}>Total Discount Given</small>
          </Col>
          <Col md="3" className="text-center">
            <h3 style={{ color: '#0dcaf0' }} className="mb-1">{stats.usage_limit || 'Unlimited'}</h3>
            <small style={{ color: '#6c757d' }}>Usage Limit</small>
          </Col>
          <Col md="3" className="text-center">
            <h3 style={{ color: '#ffc107' }} className="mb-1">{stats.remaining_uses ?? 'N/A'}</h3>
            <small style={{ color: '#6c757d' }}>Remaining Uses</small>
          </Col>
        </Row>

        {/* Usage Progress Bar */}
        {usagePercent !== null && (
          <div className="mb-4">
            <div className="d-flex justify-content-between mb-1">
              <small style={{ color: '#333' }}>Usage Progress</small>
              <small style={{ color: '#333' }}>{stats.total_uses} / {stats.usage_limit}</small>
            </div>
            <Progress
              value={usagePercent}
              color={usagePercent >= 90 ? 'danger' : usagePercent >= 70 ? 'warning' : 'primary'}
            />
          </div>
        )}

        {/* Usage Trend Chart */}
        {stats.uses_by_day?.length > 0 && (
          <div className="mb-4">
            <h6 className="mb-3" style={{ color: '#333' }}>Usage Trend (Last 30 Days)</h6>
            <ReactApexChart
              options={trendChartOptions.options}
              series={trendChartOptions.series}
              type="area"
              height={200}
            />
          </div>
        )}

        {/* Top Users */}
        {stats.top_users?.length > 0 && (
          <div className="mb-4">
            <h6 className="mb-3" style={{ color: '#333' }}>Top Users</h6>
            <Table responsive bordered size="sm">
              <thead>
                <tr>
                  <th style={{ color: '#333' }}>Customer</th>
                  <th style={{ color: '#333' }}>Phone</th>
                  <th style={{ color: '#333' }}>Orders</th>
                  <th style={{ color: '#333' }}>Uses</th>
                  <th style={{ color: '#333' }}>Total Discount</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_users.slice(0, 5).map((user, idx) => (
                  <tr key={idx}>
                    <td style={{ color: '#333' }}>
                      <div>{user.user_name}</div>
                      <small style={{ color: '#6c757d' }}>{user.user_email}</small>
                    </td>
                    <td style={{ color: '#333' }}>{user.user_phone || '-'}</td>
                    <td style={{ color: '#333' }}>
                      {user.order_numbers && user.order_numbers.length > 0 ? (
                        <div>
                          {user.order_numbers.slice(0, 3).map((orderNum, i) => (
                            <span
                              key={i}
                              style={{
                                backgroundColor: '#6c757d',
                                color: '#fff',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                                marginRight: '4px',
                                marginBottom: '2px',
                                display: 'inline-block'
                              }}
                            >
                              {orderNum}
                            </span>
                          ))}
                          {user.order_numbers.length > 3 && (
                            <small style={{ color: '#6c757d' }}>
                              +{user.order_numbers.length - 3} more
                            </small>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{ color: '#333' }}>{user.uses}</td>
                    <td>
                      <span
                        style={{
                          backgroundColor: '#28a745',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {user.total_discount?.toFixed(2)} AED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Recent Orders */}
        {stats.recent_orders?.length > 0 && (
          <div>
            <h6 className="mb-3" style={{ color: '#333' }}>Recent Orders</h6>
            <Table responsive bordered size="sm">
              <thead>
                <tr>
                  <th style={{ color: '#333' }}>Order #</th>
                  <th style={{ color: '#333' }}>Customer</th>
                  <th style={{ color: '#333' }}>Phone</th>
                  <th style={{ color: '#333' }}>Discount</th>
                  <th style={{ color: '#333' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_orders.slice(0, 10).map((order, idx) => (
                  <tr key={idx}>
                    <td>
                      <span
                        style={{
                          backgroundColor: '#6c757d',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {order.order_number || `ORD-${String(order.order_id).padStart(5, '0')}`}
                      </span>
                    </td>
                    <td style={{ color: '#333' }}>
                      <div>{order.customer_name || order.user_name || 'Guest'}</div>
                      {order.customer_email && order.customer_email !== '-' && (
                        <small style={{ color: '#6c757d' }}>{order.customer_email}</small>
                      )}
                    </td>
                    <td style={{ color: '#333' }}>{order.customer_phone || '-'}</td>
                    <td>
                      <span
                        style={{
                          backgroundColor: '#28a745',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {order.discount_amount?.toFixed(2)} AED
                      </span>
                    </td>
                    <td style={{ color: '#333' }}>
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* No Data Message */}
        {stats.total_uses === 0 && (
          <div className="text-center py-4" style={{ color: '#6c757d' }}>
            No usage data yet for this rule.
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default RuleStatistics;
