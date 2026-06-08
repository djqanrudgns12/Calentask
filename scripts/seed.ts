import { createClient } from '@supabase/supabase-js'
import { fakerKO as faker } from '@faker-js/faker'
import * as dotenv from 'dotenv'

// .env.local 파일 로드
dotenv.config({ path: '.env.local' })

// 1. 보안 검사: URL 및 Project Ref 검증
const url = process.env.SEED_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const allowedRef = process.env.SEED_ALLOWED_PROJECT_REF

if (!url || !serviceKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.')
  process.exit(1)
}

const isLocal = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')
const isAllowedRemote = allowedRef && url.includes(allowedRef)

if (!isLocal && !isAllowedRemote) {
  console.error('🚨 DANGER: 허용되지 않은 DB 접근입니다!')
  console.error(`   URL: ${url}`)
  console.error('   로컬 DB이거나 SEED_ALLOWED_PROJECT_REF와 일치하는 원격 DB여야 합니다.')
  process.exit(1)
}

// Admin 권한의 Supabase 클라이언트 생성
const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const TESTER_ACCOUNTS = [
  { username: 'tester1', email: 'tester1@calentask.com', password: 'test1234!', fullName: '테스터 일호', scale: 'high' },
  { username: 'tester2', email: 'tester2@calentask.com', password: 'test1234!', fullName: '테스터 이호', scale: 'medium' },
  { username: 'tester3', email: 'tester3@calentask.com', password: 'test1234!', fullName: '테스터 삼호', scale: 'low' },
]

async function cleanUp() {
  console.log('🧹 기존 테스터 데이터 정리 중...')
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) throw error

  const testerEmails = TESTER_ACCOUNTS.map(a => a.email)
  const toDelete = data.users.filter(u => testerEmails.includes(u.email!))

  for (const user of toDelete) {
    await supabase.auth.admin.deleteUser(user.id)
    console.log(`  - Deleted user: ${user.email}`)
  }
}

async function createUsers() {
  console.log('👤 테스터 계정 생성 중...')
  const users = []
  for (const acc of TESTER_ACCOUNTS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
      user_metadata: {
        full_name: acc.fullName,
        username: acc.username
      }
    })
    if (error) throw error
    if (data.user) {
      console.log(`  + Created user: ${acc.email}`)
      users.push({ ...acc, id: data.user.id })
    }
  }
  return users
}

async function generateDataForUser(user: any) {
  const isHigh = user.scale === 'high'
  const isMed = user.scale === 'medium'
  
  if (user.scale === 'low') {
    console.log(`  - ${user.email}: 최소 데이터 (빈 상태 테스트용)`)
    return
  }

  // Categories
  const categories = []
  const catNames = isHigh ? ['업무', '개인', '운동', '스터디', '가족', '기타'] : ['업무', '개인', '공부']
  for (const name of catNames) {
    const { data } = await supabase.from('categories').insert({
      user_id: user.id,
      name,
      hex_color: faker.color.rgb(),
      is_default: false
    }).select('id').single()
    if (data) categories.push(data.id)
  }

  // Activities (Calendar)
  const actCount = isHigh ? 80 : 30
  for (let i = 0; i < actCount; i++) {
    const isTask = faker.datatype.boolean()
    const isAllDay = faker.datatype.boolean({ probability: 0.2 })
    const date = faker.date.recent({ days: 30 }) // past 30 to future 30 approx by shifting
    const start = new Date(date)
    start.setDate(start.getDate() + faker.number.int({ min: -15, max: 45 }))
    const end = new Date(start)
    end.setHours(start.getHours() + faker.number.int({ min: 1, max: 4 }))

    await supabase.from('activities').insert({
      user_id: user.id,
      title: isTask ? `[할일] ${faker.lorem.words(3)}` : faker.company.catchPhrase(),
      start_time: start.toISOString(),
      end_time: isAllDay ? null : end.toISOString(),
      is_all_day: isAllDay,
      memo: faker.datatype.boolean() ? faker.lorem.paragraph() : null,
      type: isTask ? 'TASK' : 'EVENT',
      hex_color: faker.datatype.boolean() ? faker.color.rgb() : null,
    })
  }

  // Agenda Tasks
  const taskCount = isHigh ? 20 : 10
  for (let i = 0; i < taskCount; i++) {
    const { data: taskData } = await supabase.from('agenda_tasks').insert({
      user_id: user.id,
      title: faker.company.catchPhrase(),
      memo: faker.datatype.boolean() ? faker.lorem.paragraph() : null,
      deadline: faker.datatype.boolean() ? faker.date.soon({ days: 7 }).toISOString() : null,
      status: faker.helpers.arrayElement(['inbox', 'done', 'archive', 'trash']),
      category_id: faker.datatype.boolean() ? faker.helpers.arrayElement(categories) : null,
      is_calendar_registered: faker.datatype.boolean()
    }).select('id').single()

    if (taskData && faker.datatype.boolean()) {
      // Subtasks
      const subCount = faker.number.int({ min: 1, max: 4 })
      for (let j = 0; j < subCount; j++) {
        await supabase.from('agenda_subtasks').insert({
          task_id: taskData.id,
          title: `서브태스크 ${j + 1}: ${faker.lorem.words(2)}`,
          is_completed: faker.datatype.boolean()
        })
      }
    }
  }

  // Archive Tabs
  const tabTypes = ['document', 'canvas', 'list', 'masonry', 'journal']
  const tabs = []
  for (let i = 0; i < (isHigh ? 5 : 3); i++) {
    const bType = faker.helpers.arrayElement(tabTypes)
    const { data: tabData } = await supabase.from('archive_tabs').insert({
      user_id: user.id,
      name: `${bType.toUpperCase()} 보드 ${i+1}`,
      board_type: bType,
      position: i,
      is_secure: faker.datatype.boolean({ probability: 0.2 })
    }).select('id').single()
    if (tabData) tabs.push({ id: tabData.id, type: bType })
  }

  // Notes
  for (const tab of tabs) {
    const noteCount = isHigh ? faker.number.int({ min: 3, max: 6 }) : faker.number.int({ min: 1, max: 3 })
    for (let j = 0; j < noteCount; j++) {
      await supabase.from('notes').insert({
        user_id: user.id,
        tab_id: tab.id,
        tags: [faker.word.sample(), faker.word.sample()],
        is_pinned: faker.datatype.boolean({ probability: 0.2 }),
        content_data: {
          title: faker.lorem.sentence(),
          content: faker.lorem.paragraphs(2),
          status: 'todo',
          position: j,
          data: {}
        }
      })
    }
  }

  // Anniversaries
  const annCount = isHigh ? 4 : 2
  for (let i = 0; i < annCount; i++) {
    await supabase.from('anniversaries').insert({
      user_id: user.id,
      preset_type: faker.helpers.arrayElement(['BIRTHDAY', 'ANNIVERSARY', 'MEMORIAL', 'CUSTOM']),
      title: `${faker.person.firstName()}의 날`,
      base_date: faker.date.past({ years: 5 }).toISOString().split('T')[0],
      is_lunar: false,
      calculation_rule: { type: 'yearly' }
    })
  }

  console.log(`  - ${user.email}: 대량 데이터 주입 완료`)
}

async function main() {
  try {
    console.log('🚀 Seeding 시작...')
    await cleanUp()
    const users = await createUsers()
    
    for (const user of users) {
      await generateDataForUser(user)
    }

    console.log('✅ Seeding 완료! 테스트 계정으로 로그인 가능합니다.')
  } catch (err) {
    console.error('❌ Seeding 실패:', err)
    process.exit(1)
  }
}

main()
