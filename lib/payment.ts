import crypto from 'crypto';

const ZPAY_PID = process.env.ZPAY_PID || '';
const ZPAY_KEY = process.env.ZPAY_KEY || '';
const ZPAY_BASE_URL = 'https://zpayz.cn/submit.php';
const NOTIFY_URL = `${process.env.APP_URL || 'https://clawmigrate.xyz'}/api/orders/callback`;
const RETURN_URL_BASE = process.env.APP_URL || 'https://clawmigrate.xyz';

export function generateSign(params: Record<string, string>, key: string): string {
  const sortedKeys = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '')
    .sort();
  const queryString = sortedKeys.map(k => k + '=' + params[k]).join('&');
  const signStr = queryString + key;
  return crypto.createHash('md5').update(signStr, 'utf8').digest('hex');
}

export function verifySign(params: Record<string, string>, key: string, receivedSign: string): boolean {
  const sortedKeys = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '')
    .sort();
  const queryString = sortedKeys.map(k => k + '=' + params[k]).join('&');
  const signStr = queryString + key;
  const calculatedSign = crypto.createHash('md5').update(signStr, 'utf8').digest('hex');
  return calculatedSign === receivedSign;
}

export async function queryZpayOrder(orderId: string): Promise<{ paid: boolean; tradeNo: string | null }> {
  try {
    const url = `https://zpayz.cn/api.php?act=order&pid=${ZPAY_PID}&key=${ZPAY_KEY}&out_trade_no=${orderId}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.code === 1) {
      return { paid: data.status === 1, tradeNo: data.trade_no || null };
    }
    return { paid: false, tradeNo: null };
  } catch (error) {
    console.error('ZPAY query error:', error);
    return { paid: false, tradeNo: null };
  }
}

export async function zpayRefund(orderId: string, amount: number): Promise<{ success: boolean; message: string }> {
  try {
    if (!ZPAY_PID || !ZPAY_KEY) {
      return { success: false, message: 'ZPAY credentials not configured' };
    }

    const orderResult = await queryZpayOrder(orderId);
    if (!orderResult.paid || !orderResult.tradeNo) {
      return { success: false, message: '未找到支付交易记录，无法退款' };
    }

    const params: Record<string, string> = {
      pid: ZPAY_PID,
      act: 'refund',
      trade_no: orderResult.tradeNo,
      out_trade_no: orderId,
      money: amount.toFixed(2),
    };

    const sign = generateSign(params, ZPAY_KEY);
    params.sign = sign;
    params.sign_type = 'MD5';

    const queryString = Object.keys(params)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&');
    const url = `https://zpayz.cn/api.php?${queryString}`;

    console.log('ZPAY refund request URL:', url);
    const response = await fetch(url);
    const data = await response.json();

    console.log('ZPAY refund response:', JSON.stringify(data));

    if (data.code === 1) {
      return { success: true, message: data.msg || '退款成功' };
    }
    return { success: false, message: data.msg || '退款失败' };
  } catch (error) {
    console.error('ZPAY refund error:', error);
    return { success: false, message: '退款请求失败' };
  }
}

export function buildZpayPaymentUrl(orderId: string, planName: string, amount: number, payType: string): string {
  const zpayParams: Record<string, string> = {
    pid: ZPAY_PID,
    type: payType,
    out_trade_no: orderId,
    notify_url: NOTIFY_URL,
    return_url: RETURN_URL_BASE + '?out_trade_no=' + orderId,
    name: planName,
    money: amount.toFixed(2),
  };

  const sign = generateSign(zpayParams, ZPAY_KEY);
  zpayParams.sign = sign;
  zpayParams.sign_type = 'MD5';

  const queryString = Object.keys(zpayParams)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(zpayParams[k]))
    .join('&');
  return ZPAY_BASE_URL + '?' + queryString;
}

export function getZpayConfig() {
  return {
    pid: ZPAY_PID,
    key: ZPAY_KEY ? 'configured' : 'not configured',
  };
}