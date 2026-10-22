import { Icons } from '@/components/icons';
import { LibraryHeader } from '@/features/script-library/components/library-header';
import { AGENT_SKILL_DOWNLOAD_PATH, AGENT_SKILL_VERSION } from '@/modules/agent-access/version';

export const metadata = {
  title: 'Agent 接入 | 心梦剧本库',
  description: '使用官方 Skill 将本地剧本资料安全提交为心梦剧本库待审核草稿。'
};

const downloadHref = `${AGENT_SKILL_DOWNLOAD_PATH}?v=${AGENT_SKILL_VERSION}`;

export default function AgentPage() {
  return (
    <main className='min-h-screen bg-[#0d0e11] text-[#f4f0e8]'>
      <LibraryHeader />

      <section className='border-b border-white/10'>
        <div className='mx-auto grid min-h-[calc(100dvh-4rem)] max-w-[1480px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12'>
          <div>
            <p className='text-[11px] tracking-[0.24em] text-[#d84a3f] uppercase'>灰度内测</p>
            <h1 className='mt-6 max-w-4xl font-serif text-[clamp(3.7rem,7vw,7rem)] leading-[0.9] tracking-[-0.06em]'>
              把完整剧本包
              <br />
              交给你的 Agent
            </h1>
            <p className='mt-7 max-w-xl text-base leading-8 text-white/54'>
              官方 Skill 在你的电脑上整理剧本，通过受限 API 提交后台草稿。网站本身不运行 AI。
            </p>
            <div className='mt-9 flex flex-wrap gap-3'>
              <a
                href={downloadHref}
                download
                className='inline-flex h-12 items-center gap-3 bg-[#d84a3f] px-5 text-sm font-semibold whitespace-nowrap text-[#130f0f] transition-transform active:translate-y-px'
              >
                <Icons.download size={17} /> 下载官方 Skill
              </a>
              <a
                href='#install'
                className='inline-flex h-12 items-center gap-3 border border-white/16 px-5 text-sm whitespace-nowrap text-white/68 transition-colors hover:border-white/32 hover:text-white'
              >
                查看安装方法 <Icons.arrowRight size={16} />
              </a>
            </div>
          </div>

          <div className='border border-white/12 bg-[#121318] p-6 sm:p-8'>
            <div className='flex items-center justify-between border-b border-white/10 pb-5'>
              <div className='flex items-center gap-3'>
                <span className='grid size-10 place-items-center border border-[#d84a3f]/40 text-[#df675c]'>
                  <Icons.terminal size={19} />
                </span>
                <div>
                  <p className='text-sm'>心梦剧本入库</p>
                  <p className='mt-1 text-xs text-white/34'>官方受限上传能力</p>
                </div>
              </div>
              <span className='text-xs text-white/32'>v{AGENT_SKILL_VERSION}</span>
            </div>
            <div className='space-y-6 pt-6'>
              {[
                ['本地整理', 'Agent只在你的电脑上读取剧本资料。'],
                ['受限上传', 'Key只能提交草稿，不能发布、定价或管理用户。'],
                ['人工审核', '所有内容必须由管理员检查后才能进入剧本库。']
              ].map(([title, detail], index) => (
                <div key={title} className='grid grid-cols-[32px_1fr] gap-4'>
                  <span className='font-mono text-xs text-[#d84a3f]'>0{index + 1}</span>
                  <div>
                    <p className='text-sm text-white/82'>{title}</p>
                    <p className='mt-1 text-xs leading-6 text-white/38'>{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id='install' className='mx-auto max-w-[1480px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28'>
        <div className='max-w-2xl'>
          <h2 className='font-serif text-5xl tracking-[-0.045em]'>安装与首次连接</h2>
          <p className='mt-5 text-sm leading-7 text-white/46'>
            当前为灰度内测。普通用户可以下载安装，实际上传权限需要联系管理员开通并领取专属Key。
          </p>
        </div>

        <div className='mt-12 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]'>
          <div className='border border-white/10 p-6 sm:p-8'>
            <h3 className='text-lg'>安装 Skill</h3>
            <p className='mt-4 text-sm leading-7 text-white/42'>
              下载并解压后，把整个
              <code className='mx-1 text-[#df675c]'>xinzhi-script-uploader</code>
              文件夹放入你的Agent技能目录，然后重新启动Agent。
            </p>
            <a
              href={downloadHref}
              download
              className='mt-7 inline-flex items-center gap-2 text-sm text-[#df675c] hover:text-[#ef8177]'
            >
              下载 ZIP <Icons.download size={15} />
            </a>
          </div>

          <div className='border border-white/10 bg-white/[0.025] p-6 sm:p-8'>
            <h3 className='text-lg'>首次运行</h3>
            <p className='mt-4 text-sm leading-7 text-white/42'>
              Skill会提醒你配置Key。不要把Key发送到聊天窗口，请在自己的终端中运行以下命令，输入过程不会显示明文。
            </p>
            <pre className='mt-6 overflow-x-auto border-l-2 border-[#d84a3f] bg-[#090a0c] p-4 font-mono text-xs leading-6 text-white/72'>
              <code>python3 scripts/xinzhi_agent.py configure</code>
            </pre>
            <p className='mt-5 text-xs leading-6 text-white/32'>
              Key保存在操作系统用户配置目录中，与Skill包完全分离。Skill更新不会读取、覆盖或打包你的Key。
            </p>
          </div>
        </div>
      </section>

      <section className='border-t border-white/10'>
        <div className='mx-auto grid max-w-[1480px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-24'>
          <div>
            <h2 className='font-serif text-4xl tracking-[-0.04em]'>每次运行先检查版本</h2>
            <p className='mt-5 max-w-xl text-sm leading-7 text-white/44'>
              Skill会先与剧本库确认版本。发现更新时提醒用户，经确认后从官方地址下载、校验并安装；版本不一致时禁止上传。
            </p>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='border border-white/10 p-5'>
              <Icons.refresh className='text-[#df675c]' size={20} />
              <p className='mt-5 text-sm'>官方更新</p>
              <p className='mt-2 text-xs leading-6 text-white/36'>
                只接受本站HTTPS下载地址与校验值。
              </p>
            </div>
            <div className='border border-white/10 p-5'>
              <Icons.lock className='text-[#df675c]' size={20} />
              <p className='mt-5 text-sm'>服务器兜底</p>
              <p className='mt-2 text-xs leading-6 text-white/36'>
                权限、版本、限流和字段全部重新校验。
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
