'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, Col, Row, Table, Badge, Spinner } from 'reactstrap';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import request from '@/utils/axiosUtils';
import {
  DiscountReportsOverviewAPI,
  DiscountReportsByDateAPI,
  DiscountReportsByRuleTypeAPI,
  DiscountReportsByRuleAPI
} from '@/utils/axiosUtils/API';
import useCustomQuery from '@/utils/hooks/useCustomQuery';
import { RiPriceTag3Line, RiPercentLine, RiShoppingCart2Line, RiUserLine } from 'react-icons/ri';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const StatCard = ({ title, value, icon: Icon, color = 'primary', suffix = '' }) => (
  <Card className="h-100">
    <CardBody className="d-flex align-items-center">
      <div className={`rounded-circle bg-light-${color} p-3 me-3`}>
        <Icon size={24} className={`text-${color}`} />
      </div>
      <div>
        <h6 className="text-muted mb-1">{title}</h6>
        <h4 className="mb-0">{value}{suffix}</h4>
      </div>
    </CardBody>
  </Card>
);

const DiscountReportsPage = () => {
  const router = useRouter();
  const [dateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  const { data: overviewData, isLoading: overviewLoading } = useCustomQuery(
    ['discount-reports-overview'],
    () => request({ url: DiscountReportsOverviewAPI }, router),
    { refetchOnWindowFocus: false, select: (res) => res?.data?.data }
  );

  const { data: dateData, isLoading: dateLoading } = useCustomQuery(
    ['discount-reports-by-date', dateRange],
    () => request({
      url: `${DiscountReportsByDateAPI}?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}&group_by=day`
    }, router),
    { refetchOnWindowFocus: false, select: (res) => res?.data?.data }
  );

  const { data: ruleTypeData, isLoading: ruleTypeLoading } = useCustomQuery(
    ['discount-reports-by-rule-type', dateRange],
    () => request({
      url: `${DiscountReportsByRuleTypeAPI}?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`
    }, router),
    { refetchOnWindowFocus: false, select: (res) => res?.data?.data }
  );

  const { data: topRulesData, isLoading: topRulesLoading } = useCustomQuery(
    ['discount-reports-by-rule'],
    () => request({ url: `${DiscountReportsByRuleAPI}?sort_by=uses&sort_dir=desc&per_page=10` }, router),
    { refetchOnWindowFocus: false, select: (res) => res?.data?.data }
  );

  const lineChartOptions = {
    series: [
      {
        name: 'Total Discount',
        data: dateData?.map(d => d.total_discount) || [],
      },
      {
        name: 'Uses',
        data: dateData?.map(d => d.uses) || [],
      },
    ],
    options: {
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: false },
      },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      colors: ['#D49D67', '#17a2b8'],
      xaxis: {
        categories: dateData?.map(d => d.period) || [],
        labels: {
          rotate: -45,
          formatter: (val) => {
            if (!val) return '';
            const date = new Date(val);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          },
        },
      },
      yaxis: [
        {
          title: { text: 'Discount Amount (AED)' },
          labels: {
            formatter: (val) => val?.toFixed(0) || '0',
          },
        },
        {
          opposite: true,
          title: { text: 'Uses' },
          labels: {
            formatter: (val) => val?.toFixed(0) || '0',
          },
        },
      ],
      legend: {
        position: 'top',
      },
      tooltip: {
        shared: true,
      },
    },
  };

  const pieChartOptions = {
    series: ruleTypeData?.map(d => d.uses) || [],
    options: {
      chart: {
        type: 'donut',
      },
      labels: ruleTypeData?.map(d => d.label) || [],
      colors: ['#D49D67', '#17a2b8', '#28a745', '#dc3545', '#6c757d'],
      legend: {
        position: 'bottom',
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: { width: 300 },
          legend: { position: 'bottom' },
        },
      }],
    },
  };

  if (overviewLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <Col sm="12">
      <Card>
        <CardHeader>
          <h5>Discount Reports & Statistics</h5>
        </CardHeader>
        <CardBody>
          <Row className="mb-4">
            <Col md="3" className="mb-3">
              <StatCard
                title="Total Active Rules"
                value={overviewData?.total_active_rules || 0}
                icon={RiPriceTag3Line}
                color="primary"
              />
            </Col>
            <Col md="3" className="mb-3">
              <StatCard
                title="Discounts Today"
                value={overviewData?.total_discounts_today?.toFixed(2) || '0.00'}
                icon={RiPercentLine}
                color="success"
                suffix=" AED"
              />
            </Col>
            <Col md="3" className="mb-3">
              <StatCard
                title="Discounts This Month"
                value={overviewData?.total_discounts_this_month?.toFixed(2) || '0.00'}
                icon={RiShoppingCart2Line}
                color="info"
                suffix=" AED"
              />
            </Col>
            <Col md="3" className="mb-3">
              <StatCard
                title="Orders Today"
                value={overviewData?.orders_with_discounts_today || 0}
                icon={RiUserLine}
                color="warning"
              />
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md="8">
              <Card>
                <CardHeader>
                  <h6 className="mb-0">Discounts Over Time (Last 30 Days)</h6>
                </CardHeader>
                <CardBody>
                  {dateLoading ? (
                    <div className="text-center py-5"><Spinner /></div>
                  ) : dateData?.length > 0 ? (
                    <ReactApexChart
                      options={lineChartOptions.options}
                      series={lineChartOptions.series}
                      type="line"
                      height={350}
                    />
                  ) : (
                    <div className="text-center text-muted py-5">No data available</div>
                  )}
                </CardBody>
              </Card>
            </Col>
            <Col md="4">
              <Card>
                <CardHeader>
                  <h6 className="mb-0">Usage by Rule Type</h6>
                </CardHeader>
                <CardBody>
                  {ruleTypeLoading ? (
                    <div className="text-center py-5"><Spinner /></div>
                  ) : ruleTypeData?.length > 0 ? (
                    <ReactApexChart
                      options={pieChartOptions.options}
                      series={pieChartOptions.series}
                      type="donut"
                      height={300}
                    />
                  ) : (
                    <div className="text-center text-muted py-5">No data available</div>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md="6">
              <Card className="h-100">
                <CardHeader>
                  <h6 className="mb-0">Most Used Rule</h6>
                </CardHeader>
                <CardBody>
                  {overviewData?.most_used_rule ? (
                    <div>
                      <h5>{overviewData.most_used_rule.name}</h5>
                      <p className="text-muted mb-0">
                        <strong>{overviewData.most_used_rule.uses}</strong> uses
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted">No usage data yet</p>
                  )}
                </CardBody>
              </Card>
            </Col>
            <Col md="6">
              <Card className="h-100">
                <CardHeader>
                  <h6 className="mb-0">Top Discount by Amount</h6>
                </CardHeader>
                <CardBody>
                  {overviewData?.top_discount_by_amount ? (
                    <div>
                      <h5>{overviewData.top_discount_by_amount.name}</h5>
                      <p className="text-muted mb-0">
                        <strong>{overviewData.top_discount_by_amount.total_discount?.toFixed(2)} AED</strong> total discount
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted">No usage data yet</p>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Card>
            <CardHeader>
              <h6 className="mb-0">Top Performing Rules</h6>
            </CardHeader>
            <CardBody>
              {topRulesLoading ? (
                <div className="text-center py-3"><Spinner /></div>
              ) : topRulesData?.length > 0 ? (
                <Table responsive bordered hover>
                  <thead>
                    <tr>
                      <th>Rule Name</th>
                      <th>Type</th>
                      <th>Uses</th>
                      <th>Total Discount</th>
                      <th>Orders</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRulesData.map((rule) => (
                      <tr key={rule.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/discount-rule/edit/${rule.id}`)}>
                        <td>{rule.name}</td>
                        <td>
                          <Badge color="secondary">{rule.rule_type}</Badge>
                        </td>
                        <td>{rule.uses}</td>
                        <td>{rule.total_discount?.toFixed(2)} AED</td>
                        <td>{rule.orders_count}</td>
                        <td>
                          <Badge color={rule.is_active ? 'success' : 'danger'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-center text-muted py-3">No rules found</p>
              )}
            </CardBody>
          </Card>
        </CardBody>
      </Card>
    </Col>
  );
};

export default DiscountReportsPage;
